import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext'
import Authorization from './authentication/Authorization'
import Registration from './authentication/Registration'
import classes from './Authentication.module.css';

interface AuthenticationProps {
    username: string;
    setUsername: React.Dispatch<React.SetStateAction<string>>;
    passwordSalt: Uint8Array | null;
    setPasswordSalt: React.Dispatch<React.SetStateAction<Uint8Array | null>>;
    fullName: string;
    setFullName: React.Dispatch<React.SetStateAction<string>>;
}

const Authentication = (props: AuthenticationProps) => {
    const [isAuthorizationPage, setIsAuthorizationPage] = useState(true);
    const [isEditing, setIsEditing] = useState(true);

    const { selectedLanguage, setSelectedLanguage, languages } = useLanguage();
    const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.key == 'Enter') {

        }
    };

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const style = getComputedStyle(document.documentElement);

        ctx.fillStyle = style.getPropertyValue('--surface-color').trim();
        ctx.beginPath();
        ctx.moveTo(canvas.width, 0);
        for (let i = 0; i < canvas.height; i++) {
            ctx.lineTo(canvas.width * (0.5 + Math.cos((i / canvas.height) * Math.PI * 2 * 3) / 2), i);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();
    }, []);

    const formContent = (() => {
        if (isAuthorizationPage) {
            return (
                <Authorization
                    setIsAuthorizationPage={setIsAuthorizationPage}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    username={props.username}
                    setUsername={props.setUsername}
                    passwordSalt={props.passwordSalt}
                    setPasswordSalt={props.setPasswordSalt}
                />
            );
        } else {
            return (
                <Registration
                    setIsAuthorizationPage={setIsAuthorizationPage}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    username={props.username}
                    setUsername={props.setUsername}
                    passwordSalt={props.passwordSalt}
                    setPasswordSalt={props.setPasswordSalt}
                    fullName={props.fullName}
                    setFullName={props.setFullName}
                />
            );
        }
    })();

    return (
        <div className={classes.screen} onKeyDown={handleKeyDown}>
            <div className={classes.form}>
                {formContent}

                <div className={classes.languages}>
                    {isLanguagesOpen && (
                        languages.map(language =>
                            language !== selectedLanguage && (
                                <button
                                    key={language}
                                    className={classes['button-language']}
                                    onClick={() => {
                                        setSelectedLanguage(language);
                                        setIsLanguagesOpen(false);
                                    }}
                                >
                                    {language}
                                </button>
                            )
                        )
                    )}

                    <button className={classes['button-language-selected']} onClick={() => setIsLanguagesOpen(!isLanguagesOpen)}>
                        {selectedLanguage}
                    </button>
                </div>
            </div>

            <canvas ref={canvasRef} className={classes.canvas} />

            <div className={classes.info}>

            </div>
        </div>
    );
};

export default Authentication;