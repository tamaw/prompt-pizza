const fs = require('fs')
const { Configuration, OpenAIApi } = require("openai");
const readline = require('readline')
const WebSocket = require('ws')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

class Actor {
  description;
  conversation;

  constructor(title) {
    this.title = title
    this.filepath = `./actors/${this.title}.txt`

    fs.watchFile(this.filepath, (p, c) => {
      this.load()
    })
    this.load()
    this.conversation = this.description
  }

  load = () => {
    const data = fs.readFileSync(this.filepath, 'utf8')
    this.description = data
   }

   ask = async (text) => {
    this.conversation += text + '\n';

    var response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `\n${this.conversation}\n`,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
    return response.data.choices[0].text
   }
}

let cashier = new Actor('cashier')

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

let say = (prompt) => new Promise(answer => rl.question(prompt, answer))

const server = new WebSocket.Server({ port: 3000 })

server.on('connection', async (socket) => {
  console.log('WebSocket connection established');
  let message = {
    author: "Cashier",
    image: 'myprofile.png',
    timestamp: new Date().toISOString(),
    content: await cashier.ask()
  }

  server.clients.forEach((client) => {
    if(client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  })

  socket.on('message', async (data) => {

    // replay message
    server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });

    let message = {
      author: "Cashier",
      image: 'myprofile.png',
      timestamp: new Date().toISOString(),
      content: await cashier.ask(JSON.parse(data).content)
    }
    server.clients.forEach((client) => {
      if(client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message))
      }
    })

  });

  socket.on('close', () => {
    console.log('WebSocket connection closed');
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

async function main() {
  process.on('exit', () => {rl.close();})
  let text = ''
  for (;;)
  {
    text = await say(await cashier.ask(text) + '\n')
  }
}
// main()
