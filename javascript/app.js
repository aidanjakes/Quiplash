'use strict';

const { json } = require('express');
//Set up express
const express = require('express');
const app = express();

//Setup socket.io
const server = require('http').Server(app);
const io = require('socket.io')(server);
const got = require('got');
const request = require('request');
const { Socket } = require('socket.io');

//Setup static page handling
app.set('view engine', 'ejs');
app.use('/static', express.static('public'));

//Handle client interface on /
app.get('/', (req, res) => {
  res.render('client');
});
//Handle display interface on /display
app.get('/display', (req, res) => {
  res.render('display');
});

let firstPlayer = null; //username of first player
let players = new Map(); //map of username to either player or audience {name:,role:,admin:bool}
let playersToSockets = new Map(); //map of player usernames to socket
let socketsToPlayers = new Map(); //map of sockets to player usernames
let audienceToSockets = new Map(); //map of audience usernames to sockets
let socketsToAudience = new Map(); //map of sockets to usernames
let state = {state:0,rounds:1}; //joining = 0, prompts = 1, answers = 2, promptvote = 3, promptResult = 4
            //roundScores = 5, ovrScores = 6
let playerToSubmittedPrompts = new Map(); //map of username and prompts they entered
let playerToPromptsToAnswer = []; //list of {username,prompt}
let usernamesPromptsAnswersVotes = []; //list of {answer author,prompt,answer}
let promptsToAnswers = new Map(); //map of prompt text to array of answers and answer author
let promptCount = 0;
let promptResults = {};


//Start the server
function startServer() {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}


function handleRegister(username,password,socket){
  (async () => {
    const body = await got.post('https://quiplash-cwk.azurewebsites.net/api/player_register', {
      json: {
        username: username,
        password: password
      }
    }).json();

    console.log(body.msg);

    //if the user has successfully registered add them to maps and notify them to go to waiting
    if(state.state > 0){
      players.set(username,{name: username, role: 'audience',admin:false,promptToAnswerOne:'',
      promptToAnswerTwo:'',score:0});
      audienceToSockets.set(username,socket);
      socketsToAudience.set(socket,username);
      console.log('username:' + username + ' is in the audience');
    } if(body.msg == 'OK' && players.size < 8){
      players.set(username,{name: username, role: 'player'});
      playersToSockets.set(username,socket);
      socketsToPlayers.set(socket,username);
      console.log('username:' + username + ' is a player');
      if(firstPlayer == null){
        firstPlayer = username;
        players.set(username,{name: username, role: 'player',admin:true,promptToAnswerOne:'',
        promptToAnswerTwo:'',score:0});
      } else {
        players.set(username,{name: username, role: 'player',admin:false,promptToAnswerOne:'',
        promptToAnswerTwo:'',score:0});
      }
    } else if(body.msg == 'OK' && players.size >= 8){
      players.set(username,{name: username, role: 'audience',admin:false,promptToAnswerOne:'',
        promptToAnswerTwo:'',score:0});
      audienceToSockets.set(username,socket);
      socketsToAudience.set(socket,username);
      console.log('username:' + username + ' is in the audience');
    }
    socket.emit('registerResult',body.msg);
    updateAll();

    //=> {…}
  })();
}

function handleLogin(username,password,socket){
  //should only be able to log in if not already logged in
  if(players.has(username)){
    socket.emit('loginResult',"error, already logged in");
    return;
  }
  request('https://quiplash-cwk.azurewebsites.net/api/player_login', {
  json: true,
  body: {
    username: username,
    password: password
  }
  }, function (error, response, body){
    console.log(body.msg);
    if(state.state > 0){
      players.set(username,{name: username, role: 'audience',admin:false,promptToAnswerOne:'',
      promptToAnswerTwo:'',score:0});
      audienceToSockets.set(username,socket);
      socketsToAudience.set(socket,username);
      console.log('username:' + username + ' is in the audience');
    } else if(body.msg == 'OK' && players.size < 8){
      playersToSockets.set(username,socket);
      socketsToPlayers.set(socket,username);
      if(firstPlayer == null){
        firstPlayer = username;
        players.set(username,{name: username, role: 'player',admin:true,promptToAnswerOne:'',
        promptToAnswerTwo:'',score:0});
      } else {
        players.set(username,{name: username, role: 'player',admin:false,promptToAnswerOne:'',
        promptToAnswerTwo:'',score:0});
      }
      console.log('username:' + username + ' is a player');
    } else if(body.msg == 'OK' && players.size >= 8){
      players.set(username,{name: username, role: 'audience',admin:false,promptToAnswerOne:'',
      promptToAnswerTwo:'',score:0});
      audienceToSockets.set(username,socket);
      socketsToAudience.set(socket,username);
      console.log('username:' + username + ' is in the audience');
    }
    socket.emit('loginResult',body.msg);
    updateAll();
  });
}


//start round
function startRound(){
  state.state=1;
  updateAll();
}

function handlePromptSubmitted(promptUnamePwd,socket){
  const username = promptUnamePwd.username;
  const prompt = promptUnamePwd.prompt;
  const password = promptUnamePwd.password;
  console.log(username + ' prompt submitted');
  //store prompt to azure
  (async () => {
    const body = await got.post('https://quiplash-cwk.azurewebsites.net/api/prompt_create', {
      json: {
        username: username,
        password: password,
        text: prompt
      }
    }).json();
    console.log(body);
    socket.emit('promptSubmitResult',body.msg);

    //if prompt OK store user entered prompts locally
    if(body.msg == 'OK'){
      console.log(prompt + ' added by ' + username);
      playerToSubmittedPrompts.set(username,prompt);
    }

  })();
}

function startPromptAnswering(){
  //tell everyone to update their state
  state.state=2;
  updateAll();
  //send everyone the prompts they need to answer
  //should only be able to log in if not already logged in
  let numPromptsNeeded = 0;
  if(playersToSockets.size % 2 == 0){
    numPromptsNeeded = playersToSockets.size / 2;
  } else {
    numPromptsNeeded= playersToSockets.size;
  }
  //try get 50% local prompts if not then get rest random from database
  let promptArr = []; //list of all prompts
  let localCount = 0;
  console.log('numpromptsneeded = ' + numPromptsNeeded);
  console.log('numprompts/2 = ' + (numPromptsNeeded/2));
  for(let [playerName,prompt] of playerToSubmittedPrompts){
    if(localCount < (numPromptsNeeded/2)){
        promptArr.push(prompt);
        localCount++;
    }else{
      break;
    }
  }
  const n = numPromptsNeeded - localCount;
  console.log('random= ' + n + ' local =' + localCount);
  request('https://quiplash-cwk.azurewebsites.net/api/prompt_get_random', {
    json: true,
    body: {
      n: n
    }
    }, function (error, response, body){
      //console.log(body);
      for(const prompt of body){
        promptArr.push(prompt.text);
      }
      //now designate prompts to users
      //if num players is even
      if(playersToSockets.size % 2 == 0){
        let plyrIndex = 0;
        for(let i = 0; i < promptArr.length;i++){
          //get plyrIndex player
          let username1 = Array.from(playersToSockets.keys())[plyrIndex];
          const entry1 = {username : username1, prompt: promptArr[i]}
          playerToPromptsToAnswer.push(entry1);
          plyrIndex++;
          let username2 = Array.from(playersToSockets.keys())[plyrIndex];
          const entry2 = {username : username2, prompt: promptArr[i]}
          playerToPromptsToAnswer.push(entry2);
          plyrIndex++;
        }
      } else {
        let plyrIndex = 0;
        let prmptIndex = promptArr.length-1;
        for(let i = 0; i < promptArr.length;i++){
          let username1 = Array.from(playersToSockets.keys())[plyrIndex];
          const entry1 = {username : username1, prompt: promptArr[prmptIndex]}
          playerToPromptsToAnswer.push(entry1);
          if(prmptIndex == 0){
            prmptIndex = promptArr.length;
          }
          prmptIndex--;
          const entry2 = {username : username1, prompt: promptArr[prmptIndex]}
          playerToPromptsToAnswer.push(entry2);
          prmptIndex--;
          plyrIndex++;
        }
      }
      //add prompt1 and prompt2 to users data then tell them to update the state
      let plyrMap = new Map();
      for(const entry of playerToPromptsToAnswer){
        let username = entry.username;
        let prompt = entry.prompt;
        let con = players.get(username);
        if(plyrMap.has(username)){
          con.promptToAnswerTwo = prompt; 
        } else {
          con.promptToAnswerOne = prompt; 
          plyrMap.set(username,1);
        }
        players.set(username, con);
      }
      console.log(playerToPromptsToAnswer);
      updateAll();
  });  
  //promptArr = list of all prompts needed
}

function handleAnswer(usernPrmptAns){
  let cons = usernPrmptAns;
  cons.numVotes = 0;
  cons.voterUsernames = [];
  usernamesPromptsAnswersVotes.push(cons);
}

function startVoting(){
  //tell everyone to update their state
  state.state=3;
  updateAll();
  //go through list of username prompt answer, find prompts and corresponding answers
  //send prompt with answers and answer author to client
  for(const entry of usernamesPromptsAnswersVotes){
    let username = entry.username;
    let prompt = entry.prompt;
    let answer = entry.answer;
    const newObj = {answer: answer, author: username};
    if(promptsToAnswers.has(prompt)){
      let arr = promptsToAnswers.get(prompt);
      arr.push(newObj);
    } else {
      let arr = [];
      arr.push(newObj);
      promptsToAnswers.set(prompt,arr);
    }
  }
  updateAll();
}

function showPromptResults(){
  //get currentPrompt using promptCount
  //then find two entries with that prompt
  //send results1 = {answerAuthor, answer, numVotes, voters}
  //send results2 = {answerAuthor, answer, numVotes, voters}
  let currentPrompt = Array.from(promptsToAnswers.keys())[promptCount];
  let author1 = "";
  let author2 = "";
  for(const e of usernamesPromptsAnswersVotes){
    if(currentPrompt == e.prompt && author1 == ""){
      author1 = e.username;
    }
  }
  for(const e of usernamesPromptsAnswersVotes){
    if(currentPrompt == e.prompt && e.username != author1 && author2 == ""){
      author2 = e.username;
    }
  }
  console.log('author1 : '+ author1);
  console.log('author2 : '+ author2);

  //send results1 = {answerAuthor, answer, numVotes, voters}
  //send results2 = {answerAuthor, answer, numVotes, voters}
  let results1 = {};
  let results2 = {};
  for(const e of usernamesPromptsAnswersVotes){
    if(currentPrompt == e.prompt){
      if(e.username == author1){
        results1.answerAuthor = e.username;
        results1.answer = e.answer;
        results1.numVotes = e.numVotes;
        results1.voterUsernames = e.voterUsernames;
      } else if (e.username == author2){
        results2.answerAuthor = e.username;
        results2.answer = e.answer;
        results2.numVotes = e.numVotes;
        results2.voterUsernames = e.voterUsernames;
      }
    }
  }
  promptResults = {results1 : results1, results2: results2};
  console.log(promptResults);
  state.state = 4;
  updateAll();
  //tell client to update view and send them the results
  
}

function showNextPromptForVotes(){
  promptCount++;
  //if gone through all prompts then show round results
  if(promptCount == promptsToAnswers.size){
    state.state = 5;
    updateAll();
  } else {
    //otherwise tell thingy to show nextPrompt
    state.state = 3;
    //alreadyVoted should now be false
    for(let [playerName,socket] of playersToSockets){
      socket.emit('alreadyVoted',false);
    }
    for(let [playerName,socket] of audienceToSockets){
      socket.emit('alreadyVoted',false);
    }
    updateAll();
  }

}

function startNextRound(){
  state.rounds++;
  if(state.rounds > 3){
    console.log('END OF GAME');
    state.state = 6;
    updateAll();
    return;
  }
  playerToSubmittedPrompts.clear();
  playerToPromptsToAnswer = [];
  for(let [player,playerData] of players){
    playerData.promptToAnswerOne = '';
    playerData.promptToAnswerTwo = '';
  }
  //set client promptOneSubmitted and promptTwoSubmitted to false
  for(let [player,socket] of playersToSockets){
    socket.emit('setPromptsSubmittedTo',false);
  }
  usernamesPromptsAnswersVotes = [];
  promptsToAnswers.clear();
  for(let [player,socket] of playersToSockets){
    socket.emit('error','');
    socket.emit('alreadyVoted',false);
  }
  for(let [player,socket] of audienceToSockets){
    socket.emit('error','');
    socket.emit('alreadyVoted',false);
  }
  state.state = 1;
  promptCount = 0;
  updateAll();
  
}

function endGame(){
  firstPlayer = null; //username of first player
  players.clear(); //map of username to either player or audience {name:,role:,admin:bool}
  for(let [player,socket] of playersToSockets){
    socket.emit('resetAllVariables');
  }
  for(let [player,socket] of audienceToSockets){
    socket.emit('resetAllVariables');
  }
  playersToSockets.clear(); //map of player usernames to socket
  socketsToPlayers.clear(); //map of sockets to player usernames
  audienceToSockets.clear(); //map of audience usernames to sockets
  socketsToAudience.clear(); //map of sockets to usernames
  state = {state:0,rounds:1}; //joining = 0, prompts = 1, answers = 2, promptvote = 3, promptResult = 4
              //roundScores = 5, ovrScores = 6
  playerToSubmittedPrompts.clear();//map of username and prompts they entered
  playerToPromptsToAnswer = []; //list of {username,prompt}
  usernamesPromptsAnswersVotes = []; //list of {answer author,prompt,answer}
  promptsToAnswers = new Map(); //map of prompt text to array of answers and answer author
  promptCount = 0;
  promptResults = {};

}

function handleDisconnect(socket){
  //remove player/audience member from socket maps
  let usern = socketsToPlayers.get(socket);
  if(socketsToAudience.has(socket)){
    socketsToAudience.delete(socket);
    audienceToSockets.delete(usern);

  } 
  if(socketsToPlayers.has(socket)){
    socketsToPlayers.delete(socket);
    playersToSockets.delete(usern);
  }
  //if player is an admin then make someone else admin
  let player = players.get(usern);
  if(players.has(usern) && player.admin == true){
    player.admin = false;
    if(playersToSockets.size == 0){
      firstPlayer = null;
    }
    for(let [plyr,plyrData] of players){
      if(plyrData.role == 'player' && plyr != usern){
        plyrData.admin = true;
        console.log(plyr + ' is now admin')
        break;
      }
    }
  } 
  players.delete(usern);
  updateAll();


}


function updateAll(){
  for(let [playerName,socket] of playersToSockets){
    updatePlayer(socket,playerName);
  }
  for(let [playerName,socket] of audienceToSockets){
    updatePlayer(socket,playerName);
  }
}

function updatePlayer(socket,username){
  const thePlayer = players.get(username);
  const mapSort1 = new Map([...players.entries()].sort((a, b) => b[1].score - a[1].score));
  const upd = {players : Object.fromEntries(mapSort1),me : thePlayer,state: state,
    promptsToAnswersAuthors: Object.fromEntries(promptsToAnswers), promptCount: promptCount,
    promptResults: promptResults};
  socket.emit('update',upd);
}

//Chat message
function handleChat(message) {
    console.log('Handling chat: ' + message); 
    io.emit('chat',message);
}

//Handle new connection
io.on('connection', socket => { 
  console.log('New connection');

  //Handle on chat message received
  socket.on('chat', message => {
    handleChat(message);
  });

  socket.on('register',unpwd => {
    console.log(unpwd.username + ' pressed register');
    handleRegister(unpwd.username, unpwd.password,socket);
  });

  socket.on('login',unpwd => {
    console.log(unpwd.username + ' pressed login');
    handleLogin(unpwd.username,unpwd.password,socket);
  })

  socket.on('admin',action => {
    if(action == 'start'){
      console.log('start pressed');
      startRound();
    } else if(action == 'startAnswers'){
      console.log('Start prompt answering');
      startPromptAnswering();
    } else if(action == 'startVoting'){
      startVoting();
    } else if(action == 'showPromptResults'){
      console.log('showPromptResults');
      showPromptResults();
    } else if(action == 'showNextPromptForVotes'){
      showNextPromptForVotes();
    } else if(action == 'nextRound'){
      startNextRound();
    } else if(action == 'endGame'){
      endGame();
    }
  });

  socket.on('promptToSubmit',promptUnamePwd => {
    handlePromptSubmitted(promptUnamePwd,socket);
    console.log('prompt submitted');
  });

  socket.on('answer',userprmptansw => {
    console.log(userprmptansw.username + ' ' + userprmptansw.prompt + ' ' +
      userprmptansw.answer);
    handleAnswer(userprmptansw);
  });

  socket.on('vote',answer =>{
    console.log('vote received for ' + answer.answer);
    //increase score of person who received vote by 100 * roundNumber
    for(let [playerName,playerData] of players){
      if(answer.answerAuthor == playerName){
        playerData.score += (100 * state.rounds);

      }
    }
    //go through list of prompts to answers and increase numvotes and add username to list of voters
    for(const e of usernamesPromptsAnswersVotes){
      if(e.prompt == answer.prompt && e.username == answer.answerAuthor &&
        e.answer == answer.answer){
          e.numVotes++;
          e.voterUsernames.push(answer.voterUsername);
        }
    }
  });

  //Handle disconnection
  socket.on('disconnect', () => {
    console.log('Dropped connection');
    handleDisconnect(socket);
  });
});

//Start server
if (module === require.main) {
  startServer();
}

module.exports = server;
