
// English Chat AI - WebRTC Client
// Half 1
// =====================================

// Socket.IO
// =====================================
// Socket
// =====================================
const socket = io();

// =====================================
// Current room
// =====================================

let ROOM_ID = "";

// =====================================
// WebRTC objects
// =====================================

let localStream = null;
let remoteStream = new MediaStream();
let peerConnection = null;
// Signaling state
let makingOffer = false;
let ignoreOffer = false;
let isSettingRemoteAnswerPending = false;

// Audio element


// STUN server
const configuration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

// ===============================
// Start
// ===============================
// ===============================
// Create PeerConnection
// ===============================
function createPeerConnection() {

    peerConnection = new RTCPeerConnection(configuration);

    console.log("PeerConnection created");

    // Send ICE candidates
    peerConnection.onicecandidate = (event) => {

        if (event.candidate) {

            socket.emit("ice-candidate", {
                room: ROOM_ID,
                candidate: event.candidate
            });

        }

    };

    // Receive remote audio
    peerConnection.ontrack = (event) => {

        const remoteAudio = document.getElementById("remoteAudio");

        if (remoteAudio && remoteAudio.srcObject !== event.streams[0]) {

            remoteAudio.srcObject = event.streams[0];

            remoteAudio.play().catch(() => {});

        }

        console.log("Remote audio received");

    };

    // Connection state
    peerConnection.onconnectionstatechange = () => {

        console.log("Connection State:", peerConnection.connectionState);

        if (
            peerConnection.connectionState === "failed" ||
            peerConnection.connectionState === "disconnected"
        ) {

            console.log("Connection lost.");

        }

    };

}
    

   
async function start() {

    try {

        // Get microphone

        console.log("Microphone ready");
         localStream = await navigator.mediaDevices.getUserMedia({

    audio: {

        echoCancellation: true,

        noiseSuppression: true,

        autoGainControl: true

    },

    video: false

});
        // Create PeerConnection
        createPeerConnection();

        // Add microphone tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Attach remote stream
        // Get the audio element after the page has loaded
const remoteAudio = document.getElementById("remoteAudio");

if (remoteAudio) {
    remoteAudio.srcObject = remoteStream;
    console.log("Remote audio connected");
} else {
    console.error("Cannot find audio element");
}

       

            
      // Detect microphone activity
const audioContext = new AudioContext();

const analyser = audioContext.createAnalyser();

const microphone = audioContext.createMediaStreamSource(localStream);

microphone.connect(analyser);

analyser.fftSize = 256;

const dataArray = new Uint8Array(analyser.frequencyBinCount);

setInterval(() => {

    analyser.getByteFrequencyData(dataArray);

    let volume = dataArray.reduce((a, b) => a + b, 0);

    if (volume > 300) {

        socket.emit("speaking", {
            room: ROOM_ID,
            username: document.getElementById("username").value
        });

    }

}, 200);


       
        // Join room
        

        

    } catch (err) {

        console.error(err);

    }

}

// Start application

// =====================================
// Half 2 - Signaling & Cleanup
// =====================================

socket.on("user-joined", async (data) => {
const joinSound = new Audio("/sounds/join.mp3");
joinSound.volume = 0.5;
joinSound.play().catch(() => {});

    console.log("Another user joined");

    // Show join notification
    const chatMessages = document.getElementById("chatMessages");

    if (chatMessages) {

        chatMessages.innerHTML += `
            <p style="color:#22c55e;font-style:italic;">
                🟢 <strong>${data.username}</strong> joined the room.
            </p>
        `;

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    try {

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        socket.emit("offer", {
            room: ROOM_ID,
            offer: offer
        });

        console.log("Offer sent");

    } catch (err) {

        console.error("Offer error:", err);

    }

});
// Receive offer
socket.on("user-left", (data) => {
const leaveSound = new Audio("/sounds/leave.mp3");
leaveSound.volume = 0.5;
leaveSound.play().catch(() => {});

    const chatMessages = document.getElementById("chatMessages");

    if (chatMessages) {

        chatMessages.innerHTML += `
            <p style="color:#ef4444;font-style:italic;">
                🔴 <strong>${data.username}</strong> left the room.
            </p>
        `;

        chatMessages.scrollTop = chatMessages.scrollHeight;

    }

});
socket.on("offer", async (data) => {

    console.log("Offer received");

    try {

        // Create PeerConnection if it doesn't exist
        if (!peerConnection) {

            peerConnection = new RTCPeerConnection(configuration);

            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );

        const answer = await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(answer);

        socket.emit("answer", {
            room: ROOM_ID,
            answer: answer
        });

        console.log("Answer sent");

    } catch (err) {

        console.error("Answer error:", err);

    }

});
socket.on("username-taken", () => {

    alert("❌ This username is already being used in this room.\n\nPlease choose another username.");

});
// Receive answer
socket.on("answer", async (data) => {

    console.log("Answer received");

    try {

        if (!peerConnection) return;

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );

    } catch (err) {

        console.error("Remote description error:", err);

    }

});
// Receive ICE candidates
socket.on("ice-candidate", async (data) => {

    console.log("ICE candidate received");

    try {

        if (!peerConnection) return;

        await peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
        );

        console.log("ICE candidate added");

    } catch (err) {

        console.error("ICE candidate error:", err);

    }

});
         

    
// Cleanup
window.addEventListener("beforeunload", () => {

    if (peerConnection) {
        peerConnection.close();
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    socket.disconnect();

});

console.log("WebRTC client ready.");
// Send chat message when Enter is pressed
document.addEventListener("DOMContentLoaded", () => {

    const chatInput = document.getElementById("chatInput");

    if (chatInput) {

        chatInput.addEventListener("keypress", (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                sendMessage();

            }

        });

    }

});
// Join a room when a room card is clicked
async function joinRoom(roomName, maxParticipants) {

    const username = document.getElementById("username").value.trim();
    const country = document.getElementById("country").value;
    localStorage.setItem("username", username);
localStorage.setItem("country", country);
    if (username === "") {
        alert("Please enter your name before joining a room.");
        return;
    }

    ROOM_ID = roomName;

 // Restart WebRTC for the new room
if (peerConnection) {
    peerConnection.close();
}

peerConnection = null;

await start();

console.log("Joining room:", ROOM_ID);
    console.log("Username:", username);

   socket.emit("join-room", {
    room: ROOM_ID,
    username: username,
    country: country,
    profilePicture: localStorage.getItem("profilePicture")
});

    const roomText = document.getElementById("currentRoom");

    if (roomText) {
        roomText.textContent =
            "You joined: " + roomName + " as " + username;
    }
// =====================================
// SHOW ACTIVE ROOM PANEL
// =====================================

const activeRoomPanel = document.getElementById("activeRoomPanel");

if (activeRoomPanel) {
    activeRoomPanel.classList.add("room-active");
}

const roomDiscovery =
    document.getElementById("roomDiscovery");

if (roomDiscovery) {
    roomDiscovery.style.display = "none";
}

// Show room name
const activeRoomName = document.getElementById("activeRoomName");

if (activeRoomName) {
    activeRoomName.textContent = roomName;
}

// Show room capacity
const activeRoomCount = document.getElementById("activeRoomCount");

if (activeRoomCount) {
    activeRoomCount.textContent =
        "0 / " + maxParticipants;
}

}


// Update room member count

// ===============================
// LIVE ROOM MEMBER COUNT
// ===============================

socket.on("room-count", (data) => {

    // Update old room-card counter if it exists
    const element = document.getElementById("count-" + data.room);

    if (element) {
        element.textContent =
            "👥 " + data.count + " people online";
    }

    // Update active room counter
    const activeRoomCount =
        document.getElementById("activeRoomCount");

    if (
        activeRoomCount &&
        data.room === ROOM_ID
    ) {

        // Find the maximum from the active room card
        const activeRoomCard =
            document.querySelector(
                `.card button[onclick*="${data.room}"]`
            );

        let maxParticipants = 15;

        if (activeRoomCard) {

            const card = activeRoomCard.closest(".card");

            if (card) {

                const maxText = card.innerText.match(
                    /Max:\s*(\d+)/
                );

                if (maxText) {
                    maxParticipants =
                        parseInt(maxText[1]);
                }

            }
        }

        activeRoomCount.textContent =
            data.count + " / " + maxParticipants;
    }

});

// Show the users in the room
socket.on("user-list", (users) => {

    const userList = document.getElementById("userList");

    userList.innerHTML = "";
const myUsername = document.getElementById("username").value.trim();
  users.forEach((user) => {

    const li = document.createElement("li");

    let image = "";
if (user.profilePicture) {

    const imagePath =
        (user.profilePicture === "default.png")
            ? "/avatars/default.png"
            : "/uploads/" + user.profilePicture;

    image =
        '<img src="' + imagePath + '" ' +
        'width="40" ' +
        'height="40" ' +
        'style="border-radius:50%;vertical-align:middle;margin-right:10px;">';

}
    li.innerHTML = `
    <span class="online-dot"></span>

    ${image}

    <span>

        ${user.owner
            ? '<span class="owner-badge">OWNER</span>'
            : ''
        }

        ${user.country} ${user.username}

    </span>

    <span
        id="mic-${user.username}"
        class="mic-status"
        style="margin-left:8px;">
        🎤
    </span>

    ${
        user.owner
            ? ""
            : `<button class="kick-btn" onclick="kickUser('${user.username}')">Kick</button>`
    }
`;
    userList.appendChild(li);

});

    });


// Mute / Unmute microphone
let isMuted = false;

function toggleMute() {

    if (!localStream) {
        return;
    }

    localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
    });

    isMuted = !isMuted;

    const button = document.getElementById("muteButton");

    if (isMuted) {
        button.textContent = "🔇 Unmute";
    } else {
        button.textContent = "🎤 Mute";
    }
socket.emit("mute-status", {
    room: ROOM_ID,
    username: document.getElementById("username").value,
    muted: isMuted
});
const myMic = document.getElementById(
    "mic-" + document.getElementById("username").value
);

if (myMic) {
    myMic.textContent = isMuted ? "🔇" : "🎤";
}
}
// Leave the current room
function leaveRoom() {const activeRoomPanel =
    document.getElementById("activeRoomPanel");

if (activeRoomPanel) {
    activeRoomPanel.classList.remove("room-active");
}

const roomDiscovery =
    document.getElementById("roomDiscovery");

if (roomDiscovery) {
    roomDiscovery.style.display = "";
}

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    ROOM_ID = null;

    document.getElementById("currentRoom").textContent = "";

    const userList = document.getElementById("userList");
    if (userList) {
        userList.innerHTML = "";
    }

    alert("You have left the room.");

    location.reload();

}
  
// Send a chat message
function sendMessage() {

    const input = document.getElementById("chatInput");

    const message = input.value.trim();

    const username = document.getElementById("username").value.trim();
    const country = document.getElementById("country").value;
    if (message === "") {
        return;
    }

    socket.emit("chat-message", {
        room: ROOM_ID,
        username: username,
        message: message
    });

    input.value = "";

}

// Receive and display chat messages
socket.on("chat-message", (data) => {

    const chatBox = document.getElementById("chatMessages");

    const message = document.createElement("p");

    message.innerHTML =
        "<strong>" + data.username + ":</strong> " + data.message;

    chatBox.appendChild(message);

    chatBox.scrollTop = chatBox.scrollHeight;

});
// ===============================
// Online Users Counter
// ===============================

socket.on("online-users", (count) => {

    const elements = document.querySelectorAll("#onlineUsers");

    elements.forEach(element => {
        element.textContent = count;
    });

});
socket.on("speaking", (data) => {

    const users = document.querySelectorAll("#userList li");

    users.forEach(user => {

        if (user.textContent.includes(data.username)) {

            user.classList.add("speaking-user");

            let mic = user.querySelector(".mic-icon");

            if (!mic) {

                mic = document.createElement("span");

                mic.className = "mic-icon";

                mic.textContent = "🎤";

                user.prepend(mic);

            }

            clearTimeout(user.speakingTimeout);

            user.speakingTimeout = setTimeout(() => {

                user.classList.remove("speaking-user");

                const icon = user.querySelector(".mic-icon");

                if (icon) icon.remove();

            }, 600);

        }

    });

});

socket.on("mute-status", (data) => {

    const mic = document.getElementById("mic-" + data.username);

    if (!mic) return;

    if (data.muted) {
        mic.textContent = "🔇";
    } else {
        mic.textContent = "🎤";
    }

});
// =====================================
// Dynamic Room List
// =====================================

socket.on("room-list", (rooms) => {

    const roomSection = document.getElementById("rooms");

    rooms.forEach(room => {

        // Don't create the same room twice
        if (document.getElementById("room-" + room.roomName))
            return;

        const card = document.createElement("div");

        card.className = "card";

        card.id = "room-" + room.roomName;

        card.innerHTML = `

<div class="room-badge">🆕 New</div>

<h2>${room.roomName}</h2>

<p class="room-level">
⭐ ${room.level}
</p>

<p>
Language: ${room.language}
</p>

<p id="count-${room.roomName}">
    👥 ${room.currentUsers || 0} / ${room.maxParticipants} users
</p>
<button onclick="joinRoom('${room.roomName}', ${room.maxParticipants})">
    🎤 Join Conversation
</button>
`;

        roomSection.appendChild(card);

    });

});
// ===============================
// Load Rooms From Database
// ===============================

async function loadRooms() {

    const response = await fetch("/rooms");

    const rooms = await response.json();

    const roomSection = document.getElementById("rooms");

    roomSection.innerHTML = "";

    rooms.forEach(room => {

        roomSection.innerHTML += `

<div class="card">

<div class="room-badge">🆕 New</div>

<h2>${room.roomName}</h2>

<p class="room-level">
⭐ ${room.level}
</p>

<p>
🌍 ${room.language}
</p>
<p id="count-${room.roomName}">
    👥 ${room.currentUsers || 0} / ${room.maxParticipants} users
</p>
<button onclick="joinRoom('${room.roomName}', ${room.maxParticipants})">
    🎤 Join Conversation
</button>

</div>

`;

    });

}

loadRooms();
function kickUser(username){

    socket.emit("kick-user",{

        room: ROOM_ID,

        username: username

    });

}
socket.on("kicked", () => {

    alert("❌ You have been removed from the room by the owner.");

    location.reload();

});
// ===============================
// Logout
// ===============================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        try {

            const response = await fetch("/logout", {
                method: "POST"
            });

            const result = await response.json();

            if (result.success) {

                localStorage.removeItem("username");
                localStorage.removeItem("fullname");
                localStorage.removeItem("profilePicture");
                localStorage.removeItem("loggedIn");

                window.location.href = "login.html";

            } else {

                alert("Logout failed.");

            }

        } catch (error) {

            console.error(error);

        }

    });

}

// =====================================
// OPEN A NEWLY CREATED ROOM
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);
    const createdRoom = params.get("room");

    if (!createdRoom) {
        return;
    }

    const usernameInput =
        document.getElementById("username");

    const countryInput =
        document.getElementById("country");

    if (!usernameInput || !countryInput) {
        return;
    }

    const username =
        usernameInput.value.trim();

    const country =
        countryInput.value;

    if (!username) {
        alert("Please enter your name before joining the room.");
        return;
    }

    // Use the existing room system
    joinRoom(createdRoom, 20);

});