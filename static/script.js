const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
const wsUrl = wsProtocol + window.location.host + "/ws";
const socket = new ReconnectingWebSocket(wsUrl);

socket.addEventListener("message", (event) => {
    const assistantMessage = event.data;
    appendMessage("assistant", assistantMessage, true);
});

const chatContent = document.querySelector(".chat-content");
const inputForm = document.querySelector(".input-form");
const inputBox = document.querySelector(".input-box");
const submitBtn = document.querySelector(".submit-btn");

const txHeight = 16;
const tx = document.getElementsByTagName("textarea");

for (let i = 0; i < tx.length; i++) {
    if (tx[i].value == '') {
        tx[i].setAttribute("style", "height:" + txHeight);
    } else {
        tx[i].setAttribute("style", "height:" + (tx[i].scrollHeight));
    }
    tx[i].addEventListener("input", OnInput, false);
}

function OnInput(e) {
    this.style.height = 0;
    this.style.height = (this.scrollHeight) + "px";
}

const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');

function handleResize() {
    if (window.innerWidth >= 769) {
        chatContainer.style.maxWidth = 'calc(100% - 300px)';
        chatContainer.style.marginLeft = '300px';
    } else {
        chatContainer.style.maxWidth = '100%';
        chatContainer.style.marginLeft = '0';
    }
}

const chatContainer = document.querySelector(".chat-container");
window.addEventListener('resize', handleResize);

// Call handleResize on page load
handleResize();



sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});



document.querySelector('.api-key-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const apiKey = document.querySelector('#api-key').value;
    document.querySelector('#api-key').value = '';

    // if the API key is empty, show an alert
    if (!apiKey.trim()) {
        alert('Please enter an API key.');
        return;
    }

    try {
        // Send the API key to the server
        const response = await fetch("/set-api-key", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey }),
        });

        if (response.ok) {
            alert('API key saved successfully.');
            // reload the page
            window.location.reload();
        } else {
            alert('Failed to save the API key.');
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred while saving the API key.');
    }
});

// const stopBtn = document.querySelector(".stop-btn");

// stopBtn.addEventListener("click", () => {
//     console.log("stop");
//   socket.send("stop");
// });




let currentAssistantMessage = null;

let codeBlockBuffer = "";
let insideCodeBlock = false;
let codeBlockElement = null;
let mainContent = []

let buffer = "";
let bufferTimeout = null;

function appendMessage(role, content, append = false, streaming = false) {
    let message;

    if (append && currentAssistantMessage) {
        message = currentAssistantMessage;
    } else {
        message = document.createElement("div");
        message.classList.add("message", role);
        chatContent.appendChild(message);

        if (role === "assistant") {
            currentAssistantMessage = message;
        } else {
            currentAssistantMessage = null;
        }
        // Reset mainContent array when creating a new message
        mainContent = [];
    }

    // Add the incoming content to the buffer
    buffer += content;

    // Clear the timeout if it's already set
    if (bufferTimeout) {
        clearTimeout(bufferTimeout);
    }

    // Set a timeout to render the buffered content
    bufferTimeout = setTimeout(() => {
        mainContent.push(buffer);
        const renderedContent = marked.parse(mainContent.join(""));

        // Check if the user has scrolled up
        const shouldAutoScroll = chatContent.scrollTop + chatContent.clientHeight >= chatContent.scrollHeight - 30;

        message.innerHTML = renderedContent;

        // Add the copy button to each code block
        message.querySelectorAll("pre").forEach(pre => {
            // Create the copy button element
            const copyButton = document.createElement("button");
            copyButton.textContent = "Copy";
            copyButton.classList.add("copy-button");

            // Add the click event listener to copy the code
            copyButton.addEventListener("click", () => {
                const code = pre.querySelector("code");
                const range = document.createRange();
                const selection = window.getSelection();

                range.selectNodeContents(code);
                selection.removeAllRanges();
                selection.addRange(range);

                try {
                    document.execCommand("copy");
                } catch (err) {
                    console.error("Unable to copy the code:", err);
                }

                // Deselect the text
                selection.removeAllRanges();
            });

            // Insert the copy button into the pre element
            pre.style.position = "relative";
            pre.appendChild(copyButton);
        });

        // Scroll to the bottom if this is the last message
        if (message === chatContent.lastChild && shouldAutoScroll) {
            chatContent.scrollTop = chatContent.scrollHeight;
        }

        // Clear the buffer
        buffer = "";
    }, streaming ? 250 : 0); // Adjust the buffering time (250ms) as needed
}







function sendMessage() {
    const user_input = inputBox.value.trim();
    if (user_input) {
        appendMessage("user", user_input);
        inputBox.value = "";
        inputBox.style.height = 60 + "px"; // reset the height of the input box

        // Replace the fetch() call with the following line:
        socket.send(user_input);
    }
}


inputForm.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage();
});

class ResponseStream {
    constructor(stream) {
        this.stream = stream;
    }

    getReader() {
        return this.stream.getReader();
    }
}
// add enter to trigger the submit button
inputBox.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        if (event.shiftKey) {
            // Allow the default behavior of creating a new line when Shift + Enter is pressed
        } else {
            event.preventDefault();
            submitBtn.click();
        }
    }
});


  
  inputBox.addEventListener("keyup", event => {
    // Check for 'magick' on every keyup event
    checkForMagick(event);
  });

  
  
  function checkForMagick(event) {
    const inputValue = inputBox.value.trim().toLowerCase();
    if (inputValue.includes("....")) {
      const magickIndex = inputValue.indexOf("....");
      const beforeMagick = inputBox.value.slice(0, magickIndex);
      const afterMagick = inputBox.value.slice(magickIndex + 4);
  
      inputBox.value = beforeMagick + afterMagick; // Remove 'magick' from the input value
      inputBox.setSelectionRange(magickIndex, magickIndex); // Set the cursor position after removing 'magick'
      showModal();
    }
  }
  
  function showModal() {
    const modal = document.getElementById("magickModal");
    modal.style.display = "block";
  }
  
  // Close the dialog when clicking the 'closeDialog' button
  document.getElementById("closeDialog").addEventListener("click", () => {
    const dialog = document.getElementById("magickDialog");
    dialog.close();
  });
  
  
  
  // Close the modal when clicking outside of it
  window.onclick = function (event) {
    const modal = document.getElementById("magickModal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  }
  
  document.getElementById("option1").addEventListener("click", () => {
    console.log("Option 1 clicked");
    // Add your code for Option 1 here
  });
  
  document.getElementById("option2").addEventListener("click", () => {
    console.log("Option 2 clicked");
    // Add your code for Option 2 here
  });
  
  document.getElementById("option3").addEventListener("click", () => {
    console.log("Option 3 clicked");
    // Add your code for Option 3 here
  });
  