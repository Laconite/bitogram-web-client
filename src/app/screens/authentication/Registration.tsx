import { useState } from 'react';
import { isValidUsername, isValidPassword, isValidFullName, isValidInvitationCode } from '@/utils/validation';
import { generateSalt, hashPassword } from '@/utils/hashPassword'
import { useProtocol, client, server } from '@/contexts/ProtocolProvider';
import { useLanguage } from '@/contexts/LanguageContext'
import Input from '@/components/background/Input'
import Button from '@/components/background/Button'
import classes from './Registration.module.css';

interface RegistrationProps {
    setIsAuthorizationPage: React.Dispatch<React.SetStateAction<boolean>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    username: string;
    setUsername: React.Dispatch<React.SetStateAction<string>>;
    passwordSalt: Uint8Array | null;
    setPasswordSalt: React.Dispatch<React.SetStateAction<Uint8Array | null>>;
    fullName: string;
    setFullName: React.Dispatch<React.SetStateAction<string>>;
}

const Registration = (props: RegistrationProps) => {
    const [usernameState, setUsernameState] = useState('');
    const [password, setPassword] = useState("");
    const [passwordState, setPasswordState] = useState('');
    const [fullNameState, setFullNameState] = useState('');
    const [invitationCode, setInvitationCode] = useState("");
    const [invitationCodeState, setInvitationCodeState] = useState('');

    const { translate } = useLanguage();
    const t = translate('authentication');

    const protocol = useProtocol();

    const waitForRegister = (onEntryError: () => void, onEntry: (data: { userId: number }) => void) => {
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
            !isValidPassword(password) || 
            !isValidFullName(props.fullName) || 
            !isValidInvitationCode(invitationCode))
            return;

        props.setIsEditing(false);

        setUsernameState('');
        setPasswordState('');
        setFullNameState('');
        setInvitationCodeState('');

        const passwordSalt = generateSalt();

        protocol.send(client.register, {
            username: props.username,
            passwordSalt: passwordSalt,
            passwordHash: await hashPassword(password, passwordSalt),
            fullName: props.fullName,
            invitationCode: invitationCode,
        });

        waitForRegister(
            () => {
                setUsernameState('Error');
                setInvitationCodeState('Error');
                props.setIsEditing(true);
            },
            (data: {userId: number}) => {
                props.setPasswordSalt(passwordSalt);
                console.log(`User ID: ${data.userId}`);
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

            <Input
                type={'text'}
                placeholder={t('fullName')}
                value={props.fullName}
                onChange={(e) => props.setFullName(e.target.value)}
                state={fullNameState}
            />

            <Input
                type={'text'}
                placeholder={t('invitationCode')}
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                state={invitationCodeState}
            />

            <Button disabled={!props.isEditing} onClick={() => handleForm()}>
                {t('signUp')}
            </Button>

            <div className={classes.frame}>
                <div className={classes.text}>
                    {t('alreadyHaveAnAccount')}
                </div>

                <button className={classes['button-page']} onClick={() => props.setIsAuthorizationPage(true)}>
                    {t('logInHere')}
                </button>
            </div>
        </div>
    );
}

export default Registration;