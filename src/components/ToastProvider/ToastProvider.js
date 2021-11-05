import './ToastProvider.scss';

import React, { createRef, useState } from "react";
import { TransitionGroup, CSSTransition } from 'react-transition-group';

const ToastContext = React.createContext(null);

let id = 0

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (content, options) => {
        const { timeout, error } = {
            timeout: 3000,
            error: false,
            ...options
        }

        const toast = {
            id: id++,
            content,
            error,
            ref: createRef()
        }
        
        setToasts(toasts => [
            ...toasts,
            toast
        ]);
        setTimeout(() => removeToast(toast.id), timeout);
    };

    const removeToast = id => {
        setToasts(toasts => toasts.filter(t => t.id !== id));
    };
    
    return (
        <ToastContext.Provider
            value={{
                addToast,
                removeToast
            }}
        >
            
                <div id="toast-container">
                    <TransitionGroup>
                    {
                        toasts.map(toast => (
                            <CSSTransition timeout={200} classNames="slide-fade" key={toast.id} nodeRef={toast.ref}>
                                <div className={`toast ${toast.error ? 'error' : ''}`} ref={toast.ref}>
                                    { toast.content }
                                </div>
                            </CSSTransition>
                        ))
                    }
                    </TransitionGroup>
                </div>
            
            { children }
        </ToastContext.Provider>
    );
};

export { ToastContext };
export default ToastProvider;