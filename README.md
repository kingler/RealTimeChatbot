# Real-time Chatbot
This project is a real-time chatbot that uses the OpenAI API and WebSocket for real-time communication between the client and the server.
## Scripts
- `main.py`: The main script that orchestrates the whole process. It provides a WebSocket endpoint at `/ws` for real-time communication between the client and the server. It uses a `WebSocketManager` to manage active WebSocket connections. It handles `ping` messages by responding with `pong`, and other messages by generating a response using the OpenAPI API.
## Directories
- `static`: Contains several files including image files, an HTML file, JavaScript files, and a CSS file. These files are likely used for the web application.
## Dependencies
The Python packages that the project depends on are listed in the `requirements.txt` file.
