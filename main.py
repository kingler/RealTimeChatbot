from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import openai
import tiktoken
import os
from typing import List


os.environ["OPENAI_API_KEY"] = ""

origins = ["*"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key="a_secure_random_string_here",
    max_age=3600,
)

conversation_histories = {}

# Initialize the tokenizer
encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
def count_tokens(text):
    return len(encoding.encode(text))
MAX_MEMORY_TOKENS = 5000

class ChatInput(BaseModel):
    user_input: str

# Add this class after the ChatInput class
class ApiKeyInput(BaseModel):
    apiKey: str

@app.post("/set-api-key")
async def set_api_key(request: Request, api_key_input: ApiKeyInput):
    request.session["api_key"] = api_key_input.apiKey
    return {"detail": "API key saved successfully"}

async def generate_response(websocket: WebSocket, chat_input: ChatInput):
    # Use the WebSocket instance to access each user's conversation history
    if websocket not in conversation_histories:
        conversation_histories[websocket] = [{"role": "system", "content": "You are a helpful assistant."}]

    conversation_history = conversation_histories[websocket]

    api_key = websocket.session.get("api_key")
    if not api_key:
        print("No API key found")
        return

    openai.api_key = api_key
    conversation_history.append({"role": "user", "content": chat_input.user_input})
    total_tokens = sum(count_tokens(message["content"]) for message in conversation_history)

    while total_tokens > MAX_MEMORY_TOKENS:
        if len(conversation_history) > 2:
            removed_message = conversation_history.pop(1)
            total_tokens -= count_tokens(removed_message["content"])
        else:
            break
    print("starting API call")
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=conversation_history,
        stream=True,
    )
    print("API call complete")

    with open('chatbot.txt', 'a') as f:
        f.truncate(0)

    async for chunk in response:
        if "role" in chunk["choices"][0]["delta"]:
            continue
        elif "content" in chunk["choices"][0]["delta"]:
            r_text = chunk["choices"][0]["delta"]["content"]
            conversation_history.append({"role": "assistant", "content": r_text})
            r_text = r_text 
            with open('chatbot.txt', 'a') as f: 
                f.write(r_text)
            if websocket in websocket_manager.active_connections:
                await websocket_manager.send_message(websocket, r_text)
            else:
                # Clean up the conversation history when the WebSocket is no longer active
                if websocket in conversation_histories:
                    del conversation_histories[websocket]
                break




# @app.post("/chatbot")
# async def chatbot_endpoint(request: Request, chat_input: ChatInput):
#     try:
#         generator = generate_response(request, chat_input)
#         return StreamingResponse(generator, media_type="text/plain", headers={"X-Accel-Buffering": "no"})
#     except MissingApiKeyException:
#         return {"detail": "API key not found"}
    
class MissingApiKeyException(Exception):
    pass

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_message(self, websocket: WebSocket, message: str):
        await websocket.send_text(message)


websocket_manager = WebSocketManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            else:
                chat_input = ChatInput(user_input=data)
                await generate_response(websocket, chat_input)
    except WebSocketDisconnect:
        pass
    finally:
        await websocket_manager.disconnect(websocket)
        # Clean up the conversation history when the WebSocket is disconnected
        if websocket in conversation_histories:
            del conversation_histories[websocket]


# Mount static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")