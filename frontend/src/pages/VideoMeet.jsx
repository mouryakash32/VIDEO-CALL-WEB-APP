import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/videoComponent.css"
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { io } from "socket.io-client";
import { CallEnd, Chat, Flag, Mic, MicOff, ScreenShare, StopScreenShare, Videocam, VideocamOff } from "@mui/icons-material";

import { Badge, IconButton } from "@mui/material";
import withAuth from '../utils/withAuth'
import SnackBar from "./SnackBar";

const server_url = "http://localhost:8000";

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}


function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoRef = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);


    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState([]);

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState();

    let [showModal, setShowModal] = useState(true);

    let [screenAvailable, setSceeenAvailable] = useState();

    let [messages, setMessages] = useState([]);

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([]);

    let [videos, setVideos] = useState([]);

    let [showSnackBar, setShowSnackBar] = useState(false)

    let [snackBarMessage, setSnackBarMessage] = useState('');


    //Todo
    // if(isChrome() === false){

    // }

    const getPermission = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true })
            if (videoPermission) {
                setVideoAvailable(true)
            } else {
                setVideoAvailable(false);
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true })
            if (audioPermission) {
                setAudioAvailable(true)
            } else {
                setAudioAvailable(false);
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setSceeenAvailable(true)
            } else {
                setSceeenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });

                if (userMediaStream) {

                    window.localStream = userMediaStream;
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = userMediaStream;
                    }
                }
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {
        getPermission();
    }, []);

    let getUserMediaSuccess = (stream) => {

        try {

            window.localStream.getTracks().forEach(track => track.stop())

        } catch (e) { console.log(e) }

        window.localStream = stream;
        localVideoRef.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;


            connections[id].addStream(window.localStream)

            connections[id].createOffer()
                .then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
        }
        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false)
            setAudio(false);

            try {
                let tracks = localVideoRef.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }



            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            localVideoRef.current.srcObject = window.localStream;



            for (let id in connections) {
                connections[id].addStream(window.localStream)
                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections[id].localDescription }))
                        }).catch(e => console.log(e));
                })
            }
        })
    }

    let silence = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const dst = oscillator.connect(ctx.createMediaStreamDestination());
            oscillator.start();
            return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
        } catch (e) {
            console.warn("Failed to create silent audio:", e);
            return null;
        }
    }

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });

        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();

        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then(() => { })
                .catch((e) => console.log(e));
        } else {
            try {
                let tracks = localVideoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop())
            } catch (e) {
                console.log(e);
            }
        }
    }


    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [audio, video]);


    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === "offer") {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit("signal", fromId, JSON.stringify({ "sdp": connections[fromId].localDescription }))
                            }).catch(e => console.log(e));
                        }).catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
            }
            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }


    let addMessage = (data, sender, socketIdSender) => {

        setMessages((prevMessage) => [
            ...prevMessage,
            { sender: sender, data: data }
        ])

        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevMessage) => prevMessage + 1);
        }

    }


    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });
        socketRef.current.on("signal", gotMessageFromServer);

        socketRef.current.on("connect", () => {

            socketRef.current.emit("join-call", window.location.href)

            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("chat-message", addMessage);

            socketRef.current.on("user-left", (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
            })

            socketRef.current.on("user-joined", (id, clients) => {
                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate !== null) {
                            socketRef.current.emit("signal", socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    connections[socketListId].onaddstream = (event) => {

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            setVideos(videos => {
                                const updateVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updateVideos;
                                return updateVideos;
                            })
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoPlay: true,
                                playinline: true
                            }
                            setVideos(videos => {
                                const updateVideos = [...videos, newVideo];
                                videoRef.current = updateVideos;
                                return updateVideos;
                            })
                        }
                    };

                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream);
                    } else {
                        //Todo BlackSilence

                        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        connections[socketListId].addStream(window.localStream);
                    }

                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) {
                            continue
                        }

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) {
                            console.log(e);
                        }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit("signal", id2, JSON.stringify({ "sdp": connections[id2].localDescription }))
                                }).catch((e) => {
                                    console.log(e);
                                })
                        })
                    }
                }
            })
        })
    }


    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    let connect = () => {

        if (username.trim() === '') {
            return setAskForUsername(true)
        }

        setAskForUsername(false);
        getMedia();
    }

    let handleVideo = () => {
        setVideo(!video);
    }

    let handleAudio = () => {
        setAudio(!audio);
    }

    let getDisplayMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) {
            console.log(e);
        }

        window.localStream = stream;
        localVideoRef.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            connections[id].addStream(window.localStream)
            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections[id].localDescription }))
                    }).catch(e => console.log(e));
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);

            try {
                let tracks = localVideoRef.current.srcObject.getTracks()
                if (tracks) {
                    tracks.forEach(track => track.stop())
                }

            } catch (e) { console.log(e) }

            //Todo blackScilence

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            localVideoRef.current.srcObject = window.localStream;


            getUserMedia();

        })
    }

    let getDisplayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDisplayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e));
            }
        }
    }

    useEffect(() => {
        if (screen !== undefined) {
            getDisplayMedia();
        }
    }, [screen])

    let handleScreen = () => {
        setScreen(!screen);
    }

    let sendMessage = () => {
        socketRef.current.emit("chat-message", message, username)
        setMessage("");
    }


    let routeTo = useNavigate();
    let handleEndCall = () => {
        try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop())
        } catch (e) { console.log(e) }

        routeTo("/home")
    }

    useEffect(() => {
        return () => {

            socketRef.current?.disconnect();
            Object.values(connections).forEach(connection => connection.close?.());
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);


    






    let copyLink = () => {
        const link = window.location.href;
        navigator.clipboard.writeText(link);
        setSnackBarMessage("Link Copy")
        setShowSnackBar(true);
        setTimeout(() => {
            setShowSnackBar(false)
        }, 3000);
        
    }

    let copyCode = () => {
        const link = window.location.pathname.split('/')[1];
        navigator.clipboard.writeText(link);
        setSnackBarMessage("Code copy")
        setShowSnackBar(true);
        setTimeout(() => {
            setShowSnackBar(false)
        }, 3000);
    }



    return (
        <div>
            {askForUsername === true ?
                <div className="lobby" >
                    <div>
                        <h2>Enter into Lobby</h2>
                    </div>
                    <div className="lobbyVideo">
                        <video ref={localVideoRef} autoPlay muted  ></video>
                    </div>
                    <div style={{}}>
                        <TextField style={{ marginBottom: "10px" }} id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                connect();
                            }
                        }} variant="outlined" /> <br />
                        <Button variant="contained" onClick={connect}>Connect</Button>
                    </div>
                    <div>
                        <Button variant="contained" style={{ margin: "10px" }} onClick={copyLink}>Copy Invite link</Button>
                        <Button variant="contained" style={{ margin: "10px" }} onClick={copyCode}>Copy invite Code</Button>
                    </div>
                    <SnackBar message={snackBarMessage} show={showSnackBar} />
                </div> :
                <div className="meetVideoContainer">
                    {showModal ? <div className="chatRoom">
                        <div className="chatContainer">
                            <h1>chat</h1>

                            <div className="chattingDisplay">
                                {messages.length !== 0 ? messages.map((item, index) => {
                                    return (
                                        <div style={{ marginBottom: "20px" }} key={index}>
                                            <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    )
                                }) : <p>No Message Yet</p>}
                            </div>

                            <div className="chattingArea">
                                <TextField value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }} id="outlined-basic" label="Outlined" variant="outlined" />
                                <Button variant="contained" onClick={sendMessage}>Send</Button>
                            </div>
                        </div>
                    </div> : <></>}

                    <div className="buttonContainer">
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {(video === true) ? <Videocam /> : <VideocamOff />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEnd />

                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {(audio === true) ? <Mic /> : <MicOff />}
                        </IconButton>

                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen === true ? <ScreenShare /> : <StopScreenShare />}
                            </IconButton> : <></>}

                        <Badge badgeContent={newMessages} max={999} color="secondary">
                            <IconButton onClick={() => setShowModal(!showModal)} style={{ color: "white" }}>
                                <Chat />
                            </IconButton>
                        </Badge>

                    </div>
                    <video className="meetUserVideo" ref={localVideoRef} autoPlay muted  ></video>
                    <div className="conferenceView" >
                        {videos.map((video) => (
                            <div key={video.socketId}>
                                <video data-socket={video.socketId} ref={ref => {
                                    if (ref && video.stream) {
                                        ref.srcObject = video.stream;
                                    }
                                }}
                                    autoPlay
                                >

                                </video>
                            </div>
                        ))}
                    </div>
                </div>
            }
        </div>
    )
}


export default withAuth(VideoMeetComponent);


// STUN (Session Traversal Utilities for NAT) servers are lightweight servers that help clients discover their public IP address and port, enabling them to establish peer-to-peer connections through NAT (Network Address Translation).
