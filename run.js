const fs = require('fs')
const { Configuration, OpenAIApi } = require("openai");
const readline = require('readline')
const WebSocket = require('ws')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

class Actor {
  role
  description
  conversation
  imageUrl

  constructor(role) {
    this.role = role
    this.filepath = `./actors/${this.role}.txt`

    fs.watchFile(this.filepath, (p, c) => {
      this.load()
    })

    this.load()
  }

  load = () => {
    const data = fs.readFileSync(this.filepath, 'utf8')
    this.description = data
    this.conversation = this.description

    const resp = openai.createImage({
      prompt: this.description,
      n: 1,
      size: "256x256"
    })
    resp.then((resp) => {
      this.imageUrl = resp.data.data[0].url
    });
   }

   ask = async (text) => {
    if(text != undefined || text != null || text != '')
      this.conversation += '\n' + text + '\n';
    console.log(this.conversation)

    var response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `\n${this.conversation}\n`,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
    this.conversation += response.data.choices[0].text
    console.log(response.data)

    let message = {
      author: this.role,
      image: this.imageUrl,
      timestamp: new Date().toISOString(),
      content: response.data.choices[0].text
    }

    return message;
   }
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);


const server = new WebSocket.Server({ port: 3000 })

let cashier = new Actor('cashier')
let cook = new Actor('chef')

server.on('connection', async (socket) => {
  console.log('WebSocket connection established');
  let message = await cashier.ask()

  // send greeting message
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

    var message;
    if(JSON.parse(data).content == 'Cook:') {
      message = await cook.ask(JSON.parse(data).content)
    }

    message = await cashier.ask(JSON.parse(data).content)

    // send new message
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
