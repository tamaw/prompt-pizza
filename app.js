const socket = new WebSocket('ws://localhost:3000');

const chat = document.getElementById('chat');
const form = document.querySelector('form');

socket.addEventListener('open', (event) => {
  console.log('WebSocket connection established');
});

socket.addEventListener('message', (event) => {
  console.log(event);
  const message = JSON.parse(event.data);
  const timestamp = new Date(message.timestamp).toLocaleTimeString();
  const isMe = message.author === 'Me';
  const alignClass = isMe ? '' : 'message-right';
  const html = `
    <div class="message ${alignClass}">
      <img src="${message.image}" alt="Profile image">
      <span class="author">${message.author}</span>
      <span class="timestamp">${timestamp}</span>
      <div class="content">${message.content}</div>
    </div>
  `;
  chat.insertAdjacentHTML('beforeend', html);
  chat.scrollTop = chat.scrollHeight;
});

socket.addEventListener('close', (event) => {
  console.log('WebSocket connection closed');
});

socket.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = event.target.elements.message;
  const message = {
    author: 'Me',
    image: '',
    content: input.value,
    timestamp: new Date().toISOString()
  };
  socket.send(JSON.stringify(message));
  input.value = '';
});
