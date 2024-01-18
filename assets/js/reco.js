import { Socket } from "phoenix"

const pcConfig = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };

const button = document.getElementById("button");
const videoPlayer = document.getElementById("videoPlayer");

let localStream;
let socket;
let channel;
let pc;

async function start() {
  console.log("Starting");
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  videoPlayer.srcObject = localStream;

  socket = new Socket("/socket", {});
  socket.connect();

  channel = socket.channel("room:room1", {})
  channel.join()
    .receive("ok", resp => { console.log("Joined successfully", resp) })
    .receive("error", resp => { console.log("Unable to join", resp) })

  channel.on("signaling", msg => {

    if (msg.type == 'answer') {
      console.log("Setting remote answer");
      pc.setRemoteDescription(msg);
    } else if (msg.type == 'ice') {
      console.log("Adding ICE candidate");
      pc.addIceCandidate(msg.data);
    }

  })

  pc = new RTCPeerConnection();
  pc.onicecandidate = ev => {
    channel.push('signaling', JSON.stringify({ type: 'ice', data: ev.candidate }));
  };
  pc.addTrack(localStream.getAudioTracks()[0]);
  pc.addTrack(localStream.getVideoTracks()[0]);

  offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  channel.push("signaling", JSON.stringify(offer));
}

function stop() {
  console.log("Stopping");
  localStream.getTracks().forEach(track => track.stop());
  videoPlayer.srcObject = null;
  channel.leave();
  socket.disconnect();
}

button.onclick = () => {
  if (button.innerText == "Start") {
    button.innerText = "Stop";
    start();
  } else if (button.innerText == "Stop") {
    button.innerText = "Start";
    stop();
  }
}