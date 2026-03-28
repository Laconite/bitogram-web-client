import { useState, useEffect, useRef, type RefObject, type Dispatch, type SetStateAction } from "react";
import { usePacketManager, TO_ID_BY_NAME } from "@contexts/PacketManagerContext";
import { FROM_ID_BY_NAME } from "@contexts/PacketManagerContext";
import { NetStream, NetPacket } from "@utils/Net";
import { type UserModel, type ChannelModel } from "../Main";
import Input from "@components/surface/Input"
import classes from "./Search.module.css";
import UserPreview from "./search/UserPreview"

interface SearchProps {
    text: string;
    setText: (text: string) => void;
    textRef: RefObject<string>;

    searching: boolean;
    setSearching: Dispatch<SetStateAction<boolean>>;

    searchedUserIds: number[];
    setSearchedUsersIds: Dispatch<SetStateAction<number[]>>;

    users: UserModel[];
    setUsers: Dispatch<SetStateAction<UserModel[]>>;
    usersRef: RefObject<UserModel[]>;

    channels: ChannelModel[];
    setChannels: Dispatch<SetStateAction<ChannelModel[]>>;

    selectedChannel: ChannelModel | null;
    selectChannel: (channel: ChannelModel) => void;
}

const Search = ({
    text, setText, textRef,
    searching, setSearching,
    searchedUserIds, setSearchedUsersIds,
    users, setUsers,
    usersRef,
    channels, setChannels,
    selectedChannel, selectChannel,
}: SearchProps) => {
    const { sendPacket, subscribePacket, unsubscribePacket } = usePacketManager();

    const debounceTimeout = useRef<number | null>(null);

    const sendSearchPacket = async (searchText: string) => {
        const netStream = new NetStream();
        netStream.writeNumber(TO_ID_BY_NAME.SEARCH);
        netStream.writeStructure({
            searchText: "string",
        }, [
            searchText,
        ]);
        sendPacket(netStream.buffer);
    }

    const handleSearch = () => {
        if (!textRef.current || textRef.current.length === 0) {
            setSearching(false);
            return;
        }

        setSearching(true);

        if (debounceTimeout.current !== null) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = window.setTimeout(() => {
            sendSearchPacket(textRef.current);

            debounceTimeout.current = null;
        }, 500);
    };
    const handleUserPreviewClick = (user: UserModel) => {
        const channel = channels.find(channel => channel.interlocutorId === user.id);

        if (channel) {
            selectChannel(channel);
        } else {
            selectChannel({
                interlocutorId: user.id
            });
        }
    };

    useEffect(() => {
        const handleSearch = (packet: NetPacket) => {
            console.log("Packet: Search");

            const mergedMap = new Map<number, UserModel>();

            usersRef.current.forEach(user => {
                mergedMap.set(user.id, user);
            });

            packet.values.users.forEach((user: UserModel) => {
                user.isOnline = 0;

                const existing = mergedMap.get(user.id);

                if (!existing) {
                    mergedMap.set(user.id, user);
                } else {
                    mergedMap.set(user.id, {
                        ...existing,
                        ...Object.fromEntries(
                            Object.entries(user).filter(([_, value]) => value != null)
                        )
                    });
                }
            });

            const mergedUsers = Array.from(mergedMap.values());

            setUsers(mergedUsers);
            setSearchedUsersIds(packet.values.users.map((user: UserModel) => user.id));
            setSearching(false);
        }

        subscribePacket(FROM_ID_BY_NAME.SEARCH, handleSearch);

        return () => {
            unsubscribePacket(FROM_ID_BY_NAME.SEARCH, handleSearch);
        };
    }, [subscribePacket, unsubscribePacket]);

    const usersForPreview: UserModel[] = searchedUserIds
        .map(id => users.find(user => user.id === id))
        .filter((user): user is UserModel => user !== undefined);

    return (
        <>
            <div className={classes.container}>
                <Input
                    placeholder={"Search"}
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        handleSearch();
                    }}
                />
            </div>

            {searching
                ? <div className={classes.sectionSignature}>Searching...</div>
                : (
                    text.length != 0 && usersForPreview.length != 0 && <>
                        <div className={classes.sectionSignature}>Users</div>

                        {usersForPreview.map(user => (
                            <UserPreview
                                key={user.id}
                                user={user}
                                onClick={handleUserPreviewClick}
                            />
                        ))}
                    </>
                )
            }
        </>
    )
};

export default Search;