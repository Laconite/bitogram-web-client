import { useState } from 'react';
import { isValidUsername, isValidPassword } from '@/utils/validation';
import { hashPassword } from '@/utils/hashPassword'
import { useProtocol, client, server } from '@/contexts/ProtocolProvider';
import { useLanguage } from '@/contexts/LanguageContext'
import Input from '@/components/background/Input'
import Button from '@/components/background/Button'
import classes from './Authorization.module.css';

interface AuthorizationProps {
    setIsAuthorizationPage: React.Dispatch<React.SetStateAction<boolean>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    username: string;
    setUsername: React.Dispatch<React.SetStateAction<string>>;
    passwordSalt: Uint8Array | null;
    setPasswordSalt: React.Dispatch<React.SetStateAction<Uint8Array | null>>;
}

const Authorization = (props: AuthorizationProps) => {
    const [usernameState, setUsernameState] = useState('');
    const [password, setPassword] = useState("");
    const [passwordState, setPasswordState] = useState("");

    const { translate } = useLanguage();
    const t = translate('authentication');

    const protocol = useProtocol();

    const waitForGetPasswordSalt = (onPasswordSalt: (data: { passwordSalt: Uint8Array }) => void) => {
        const finish = () => {
            protocol.unsubscribe(server.passwordSalt, passwordSaltHandler);
        };

        const passwordSaltHandler = (data: { passwordSalt: Uint8Array }) => {
            finish();
            onPasswordSalt(data);
        };

        protocol.subscribe(server.passwordSalt, passwordSaltHandler);

        setTimeout(finish, 5000);
    };

    const waitForAuthorize = (onEntryError: () => void, onEntry: (data: { userId: number }) => void) => {
        const finish = () => {
            protocol.unsubscribe(server.entryError, entryErrorHandler);
            protocol.unsubscribe(server.entry, onEntry);
        };

        const entryErrorHandler = () => {
            finish();
            onEntryError();
        };

        const entryHandler = (data: { userId: number }) => {
            finish();
            onEntry(data);
        };

        protocol.subscribe(server.entryError, entryErrorHandler);
        protocol.subscribe(server.entry, onEntry);

        setTimeout(finish, 5000);
    }

    const handleForm = async () => {
        if (!isValidUsername(props.username) ||
            !isValidPassword(password))
            return;

        props.setIsEditing(false);

        setUsernameState('');
        setPasswordState('');

        protocol.send(client.getPasswordSalt, {
            username: props.username,
        });

        waitForGetPasswordSalt(
            async (data: { passwordSalt: Uint8Array }) => {
                protocol.send(client.authorize, {
                    username: props.username,
                    passwordHash: await hashPassword(password, data.passwordSalt),
                });

                waitForAuthorize(
                    () => {
                        setUsernameState('Error');
                        setPasswordState('Error');
                        props.setIsEditing(true);
                    },
                    (data: { userId: number }) => {
                        console.log(`User ID: ${data.userId}`);
                    }
                );
            }
        );
    }

    return (
        <div className={classes.form}>
            <Input
                type={'input'}
                placeholder={t('username')}
                value={props.username}
                onChange={(e) => props.setUsername(e.target.value)}
                state={usernameState}
            />

            <Input
                type={'password'}
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                state={passwordState}
            />

            <Button disabled={!props.isEditing} onClick={() => handleForm()}>
                {t('logIn')}
            </Button>

            <div className={classes.frame}>
                <div className={classes.text}>
                    {t('doNotHaveAnAccount')}
                </div>

                <button className={classes['button-page']} onClick={() => props.setIsAuthorizationPage(false)}>
                    {t('createHere')}
                </button>
            </div>
        </div>
    );
}

export default Authorization;