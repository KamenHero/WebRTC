import { useState, useEffect, useRef } from "react";

const ws = new WebSocket("ws://localhost:8000/ws/signaling/");

function App() {
  const [userId, setUserId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [targetId, setTargetId] = useState("");
  const localVideo = useRef();
  const remoteVideo = useRef();
  const pcRef = useRef();

  useEffect(() => {
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "send_offer") {
        await handleOffer(data);
      } else if (data.type === "send_answer") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "ice_candidate") {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };
  }, []);

  const joinRoom = () => {
    ws.send(JSON.stringify({ type: "join_room", room: roomId, user_id: userId }));
  };

  const startCall = async () => {
    pcRef.current = new RTCPeerConnection();
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));
    localVideo.current.srcObject = stream;

    pcRef.current.onicecandidate = e => {
      if (e.candidate) {
        ws.send(JSON.stringify({ type: "ice_candidate", target: targetId, candidate: e.candidate }));
      }
    };

    pcRef.current.ontrack = e => {
      remoteVideo.current.srcObject = e.streams[0];
    };

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    ws.send(JSON.stringify({ type: "send_offer", target: targetId, sdp: offer }));
  };

  const handleOffer = async (data) => {
    pcRef.current = new RTCPeerConnection();

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));
    localVideo.current.srcObject = stream;

    pcRef.current.onicecandidate = e => {
      if (e.candidate) {
        ws.send(JSON.stringify({ type: "ice_candidate", target: data.user_id, candidate: e.candidate }));
      }
    };

    pcRef.current.ontrack = e => {
      remoteVideo.current.srcObject = e.streams[0];
    };

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: "send_answer", target: data.user_id, sdp: answer }));
  };

  return (
    <div>
      <h2>MCP WebRTC Demo</h2>
      <input placeholder="Your ID" onChange={e => setUserId(e.target.value)} />
      <input placeholder="Room ID" onChange={e => setRoomId(e.target.value)} />
      <input placeholder="Target ID" onChange={e => setTargetId(e.target.value)} />
      <button onClick={joinRoom}>Join Room</button>
      <button onClick={startCall}>Start Call</button>
      <div>
        <video ref={localVideo} autoPlay muted width={300} />
        <video ref={remoteVideo} autoPlay width={300} />
      </div>
    </div>
  );
}

export default App;
