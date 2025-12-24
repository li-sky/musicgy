import React, { useState, useEffect, useRef } from 'react';
import { api, UserProfile } from '../api.js';

export const LoginModal = ({ isOpen, onClose, onLoginSuccess }: { isOpen: boolean, onClose: () => void, onLoginSuccess: (p: UserProfile) => void }) => {
    const [step, setStep] = useState<'loading' | 'qr' | 'success'>('loading');
    const [qrImg, setQrImg] = useState('');
    const [statusText, setStatusText] = useState('Initializing...');
    const timerRef = useRef<number | undefined>(undefined);
    const keyRef = useRef<string>('');

    useEffect(() => {
        if (!isOpen) {
            clearInterval(timerRef.current);
            setStep('loading');
            return;
        }

        const init = async () => {
            try {
                const key = await api.getQrKey();
                keyRef.current = key;
                const img = await api.createQr(key);
                setQrImg(img);
                setStep('qr');
                setStatusText('Scan with Netease App');

                timerRef.current = window.setInterval(async () => {
                    try {
                        const res = await api.checkQr(keyRef.current);
                        if (res.code === 800) {
                            setStatusText('Expired. Re-opening...');
                            clearInterval(timerRef.current);
                        } else if (res.code === 801) {
                            setStatusText('Waiting for scan...');
                        } else if (res.code === 802) {
                            setStatusText('Scanned! Confirm on phone.');
                        } else if (res.code === 803) {
                            setStatusText('Success!');
                            clearInterval(timerRef.current);
                            const status = await api.getAuthStatus();
                            if (status.profile) onLoginSuccess(status.profile);
                            onClose();
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }, 2000);

            } catch (e) {
                setStatusText('Error loading QR');
            }
        };

        init();
        return () => clearInterval(timerRef.current);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="glass w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center p-8 space-y-6">
                <h2 className="text-xl font-bold text-white">Login to Netease</h2>
                
                <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                    {step === 'loading' && <div className="text-slate-900 animate-pulse">Loading QR...</div>}
                    {step === 'qr' && (
                       <img src={qrImg} alt="Login QR" className="w-full h-full object-contain" />
                    )}
                </div>

                <div className="text-center">
                    <p className="text-purple-300 font-medium">{statusText}</p>
                    <p className="text-xs text-slate-400 mt-2">Open Netease Cloud Music App Scan</p>
                </div>

                <button onClick={onClose} className="text-slate-500 hover:text-white text-sm">Cancel</button>
            </div>
        </div>
    );
};