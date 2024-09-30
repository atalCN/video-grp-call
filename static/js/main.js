console.log('In main js')

var mapPeers = {}; // to track all peer connection and data channels

var usernameInput = document.querySelector('#username');
var btnJoin = document.querySelector('#btn-join');
var username;

var webSocket;

let pcConfig = {
    iceServers: [
        { url: "stun:stun.l.google.com:19302" },
    ],
};

btnJoin.addEventListener('click', () => {
    username = usernameInput.value;

    console.log('username: ', username);

    if(username == ''){
        return;
    }

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;

    var loc = window.location;
    var wsStart = 'ws://';

    if(loc.protocol == 'https:'){
        wsStart = 'wss://';
    }

    let ws_scheme = window.location.protocol == "https:" ? "wss://" : "ws://";
    console.log(ws_scheme);
    
    var endPoint = ws_scheme + window.location.host + "/ws/call/"

    console.log('endpoint: ',  endPoint);

    webSocket = new WebSocket(endPoint); 

    webSocket.onopen = (event) => {
        //let's send myName to the socket
        console.log('Connection Open!!')

        sendSignal('new-peer',{})
    };
    
    webSocket.onmessage = (e) => {
        try {
            var response = JSON.parse(e.data);
            console.log('Received message:', response);
            var peerUsername = response['peer'];
            var action = response['action'];
            // console.log('on message: ', action);
            console.log('Received action:', action, 'Type of action:', typeof action);
    
            if (username == peerUsername) {
                return;
            }
    
            var receiver_channel_name = response['message']['reciever_channel_name'];
            
            // Handle 'new-peer'
            if (action === 'new-peer') {
                createOfferer(peerUsername, receiver_channel_name);
                return;
            } else if (action === 'new-offer') {
                console.log('Message received for new-offer:', response['message']);
                var offer = response['message']['sdp'];
                console.log('offer: ', offer);
                if (offer) {
                    createAnswerer(offer, peerUsername, receiver_channel_name);
                } else {
                    console.error('SDP offer missing from the new-offer message');
                }
                return;            
                // createAnswerer(offer, peerUsername, receiver_channel_name);
                // return;
            } else if (action === 'new-answer') {
                var answer = response['message']['sdp'];
                console.log('answer: ', answer);
                var peer = mapPeers[peerUsername][0];
                peer.setRemoteDescription(answer);
                return;
            } else {
                console.error('Unrecognized action:', action);
            }
        } catch (error) {
            console.error('Error parsing message', e.data, error);
        }
        
        // console.log('message: ', message);
    };

    // webSocket.addEventListener('open', (e) => {
    //     console.log('Connection Open!!')

    //     sendSignal('new-peer',{})
    // })

    // webSocket.addEventListener('message', webSocketOnMessgae)
    webSocket.close = (e) =>{
        console.log('Connection closed!!')
    };

    // webSocket.addEventListener('closed', (e) => {
    //     console.log('Connection closed!!')
    // })
    
});

// function webSocketOnMessgae(event){
//     var response = JSON.parse(event.data);
//     var peerUsername = response['peer'];
//     var action = response['action'];
    
//     if(username == peerUsername){
//         return;
//     }
//     console.log('on message: ', action)
//     var reciever_channel_name = response['message']['reciever_channel_name']

//     if (action == 'new-peer'){
//         createOfferer(peerUsername, reciever_channel_name);

//         return;
//     }

//     if (action == 'new-offer'){
//         var offer = response['message']['sdp']
//         console.log('offer: ', offer);

//         createAnswerer(offer, peerUsername, reciever_channel_name);

//         return;
//     }

//     if (action == 'new-answer'){
//         var answer = response['message']['sdp']
//         console.log('answer: ', answer);

//         var peer = mapPeers[peerUsername][0];

//         peer.setRemoteDescription(answer)

//         return;
//     }
    
//     console.log('message: ', message);
// }

function sendSignal(action,message){
    webSocket.send(
        JSON.stringify({
          peer: username,
          action: action,
          message: message
        })
      );
}

// Create Offer
function createOfferer(peerUsername, reciever_channel_name){
    var peer = new RTCPeerConnection(pcConfig);

    addLocalTracks(peer);

    var dc = peer.createDataChannel('channel');
    dc.addEventListener('open', () => {
        console.log('Connection opened for offer!')
    });
    dc.addEventListener('message', dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];
    console.log('mapPeers list track when offer', mapPeers);

    peer.addEventListener('iceconnectionstatechange', () =>{
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed'  || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            console.log('iceConnectionState: ', iceConnectionState);
            delete mapPeers[peerUsername];
            console.log('mapPeers list track when iceConnectionState', mapPeers);

            if(iceConnectionState != 'closed'){
                peer.close();
            }

            removeVideo(remoteVideo);
        }

    });

    peer.addEventListener('icecandidate', (event) =>{
        if(event.candidate){
            console.log('New Candidate Offer: ', JSON.stringify(peer.localDescription.sdp));

            return;
        }

        sendSignal('new-offer', {
            sdp: peer.localDescription.sdp,
            reciever_channel_name: reciever_channel_name
        })
    });

    peer.createOffer().then(o => {
        peer.setLocalDescription(o)
    }).then(() =>{
        console.log('Local description set successfully.')
    })
}

// Create Answer
function createAnswerer(offer, peerUsername, reciever_channel_name){
    var peer = new RTCPeerConnection(pcConfig);

    addLocalTracks(peer);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel', e =>{
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
            console.log('Connection opened for answer!')
        });
        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc];
        console.log('mapPeers list track', mapPeers);
    });

    peer.addEventListener('iceconnectionstatechange', () =>{
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed'  || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            console.log('iceConnectionState: ', iceConnectionState);
            delete mapPeers[peerUsername];
            console.log('mapPeers list track', mapPeers);

            if(iceConnectionState != 'closed'){
                peer.close();
            }

            removeVideo(remoteVideo);
        }

    });

    peer.addEventListener('icecandidate', (event) =>{
        if(event.candidate){
            console.log('New Candidate Answer: ', JSON.stringify(peer.localDescription.sdp));

            return;
        }

        sendSignal('new-answer', {
            sdp: peer.localDescription.sdp,
            reciever_channel_name: reciever_channel_name
        })
    });

    peer.setRemoteDescription(offer).then(() => {
        console.log('Remote description set sucessfully is %s.', peerUsername);
        return peer.createAnswer();
    }).then(a => {
        console.log('Answer created!');
        peer.setLocalDescription(a);
    })
}

function addLocalTracks(peer){
    localStream.getTracks().forEach(track =>{
        peer.addTrack(track, localStream);
    });
}

var messageList = document.querySelector('#message-list')
function dcOnMessage(event){
    var message = event.data;
    console.log('chat message: ', message);

    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);
}

function createVideo(peerUsername){
    var videoContainer = document.querySelector('#video-container');

    var remoteVideo = document.createElement('video');

    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);

    videoWrapper.appendChild(remoteVideo);

    return remoteVideo;
}

function setOnTrack(peer, remoteVideo){
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream)
    })
}

function removeVideo(video){
    var videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}

// local video setup
var localStream = new MediaStream();
const constraints = {
    'video': true,
    'audio': true
};

const localvideo = document.querySelector('#local-video');

const btnToggleAudio = document.querySelector('#btn-toggle-audio');
const btnToggleVideo = document.querySelector('#btn-toggle-video');

var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localvideo.srcObject = localStream;
        localvideo.muted = true;

        // var audioTracks = stream.getAudioTracks()
        // var videoTracks = stream.getVideoTracks()

        // audioTracks[0].enabled = true;
        // videoTracks[0].enabled = true;

        // btnToggleAudio.addEventListener('clicl', () =>{
        //     audioTracks[0].enabled = !audioTracks[0].enabled;

        //     if(audioTracks[0].enabled){
        //         btnToggleAudio.innerHTML = 'Audio Mute';

        //         return;
        //     }

        //     btnToggleAudio.innerHTML = 'Audio Unmute';
        // });

        // btnToggleVideo.addEventListener('clicl', () =>{
        //     videoTracks[0].enabled = !videoTracks[0].enabled;

        //     if(audioTracks[0].enabled){
        //         btnToggleVideo.innerHTML = 'Video Off';

        //         return;
        //     }

        //     btnToggleVideo.innerHTML = 'Video On';
        // })
    })
    .catch(error =>{
        console.log('Error accessing media devices.', error);
    })
