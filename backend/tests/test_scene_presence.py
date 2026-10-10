"""Room presence: each join/leave tells the room how many devices are connected."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import scene

app = FastAPI()
app.include_router(scene.router)
app.include_router(scene.ws_router)


def _next_presence(ws):
    while True:
        msg = ws.receive_json()
        if msg.get("type") == "presence":
            return msg["count"]


def test_presence_counts_devices_in_the_room():
    client = TestClient(app)
    room = client.post("/scene/room").json()["room"]
    with client.websocket_connect(f"/ws/scene?room={room}&role=lawyer") as laptop:
        assert _next_presence(laptop) == 1
        with client.websocket_connect(f"/ws/scene?room={room}&role=person") as phone:
            assert _next_presence(phone) == 2
            assert _next_presence(laptop) == 2
        assert _next_presence(laptop) == 1


if __name__ == "__main__":
    import signal
    signal.alarm(20)  # without presence messages the receive loop would wait forever
    test_presence_counts_devices_in_the_room()
    print("presence test passed")
