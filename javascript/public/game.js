var socket = null;

//Prepare game
var app = new Vue({
    el: '#game',
    data: {
        connected: false,
        messages: [],
        chatmessage: '',
        alreadyRegistered: true,
        username: '',
        password: '',
        error: '',
        promptErr:'',
        players:{},
        promptToSubmit:'',
        answerToSubmit:'',
        promptOneSubmitted:false,
        promptTwoSubmitted:false,
        hasTwoPrompts:false,
        alreadyVoted:false,
        me: { name: "", role: "", admin: false, promptToAnswerOne:"", promptToAnswerTwo:""}, 
        promptsToAnswersAuthors: {},
        promptResults:{},
        loggedIn:false,
        promptAnswerIndex:0,
        //        <p>{{item[1].answer}}</p>
        state: { state: 0,rounds:0 }
    },
    mounted: function() {
        connect(); 
    },
    methods: {
        resetAllVariables(){
            app.alreadyRegistered = true;
            app.players = {};
            app.promptOneSubmitted = false;
            app.promptTwoSubmitted = false;
            app.hasTwoPrompts = false;
            app.alreadyVoted = false;
            app.me = { name: "", role: "", admin: false, promptToAnswerOne:"", promptToAnswerTwo:""};
            app.promptsToAnswersAuthors= {};
            app.promptResults={};
            app.loggedIn=false;
            app.promptAnswerIndex=0;
            app.state = { state: 0,rounds:0 }

        },
        handleChat(message) {
            if(this.messages.length + 1 > 10) {
                this.messages.pop();
            }
            this.messages.unshift(message);
        },
        chat() {
            socket.emit('chat',this.chatmessage);
            this.chatmessage = '';
        },
        register(){
            const unpwd = { username: this.username, password: this.password};
            socket.emit('register',unpwd);            
        },
        signUp(){
            this.alreadyRegistered = false;
        },login(){
            const unpwd = { username: this.username, password: this.password};
            socket.emit('login',unpwd);
            
        },admin(action){
            console.log('admin ' + action);
            socket.emit('admin',action);
        },submitPrompt(){
            const promptAndUname = {username: this.username, password: this.password,
                 prompt: this.promptToSubmit};
            this.promptToSubmit = '';
            socket.emit('promptToSubmit',promptAndUname);
            this.error = '';
        },submitAnswer(){
            //set answer to submit to 0 after
            if(!this.promptOneSubmitted){
                if(this.answerToSubmit.trim() == ''){
                    this.answerToSubmit = "blank";
                }
                const obj = {username: this.username, prompt:this.me.promptToAnswerOne,
                    answer: this.answerToSubmit};
                    socket.emit('answer',obj);
                this.answerToSubmit = '';
                this.promptOneSubmitted = true;
            } else {
                if(this.answerToSubmit.trim() == ''){
                    this.answerToSubmit = "blank";
                }
                const obj = {username: this.username, prompt:this.me.promptToAnswerTwo,
                    answer: this.answerToSubmit};
                    socket.emit('answer',obj);
                this.answerToSubmit = '';
                this.promptTwoSubmitted = true;
            } 
        },vote(prompt,answer,answerAuthor){
            //this.promptAnswerIndex++;
            //tell the server the prompt, answer voted for and author of answer
            const vote = {prompt: prompt, answer: answer, answerAuthor: answerAuthor,
                voterUsername:this.username};
            socket.emit('vote',vote);
            this.alreadyVoted = true;
            //the server should then wait for votes to be received, show prompt results
            //then vote starts for next prompt
        }
    }
});

function connect() {
    //Prepare web socket
    socket = io();

    //Connect
    socket.on('connect', function() {
        //Set connected state to true
        app.connected = true;
    });

    //Handle connection error
    socket.on('connect_error', function(message) {
        alert('Unable to connect: ' + message);
    });

    //Handle disconnection
    socket.on('disconnect', function() {
        alert('Disconnected');
        app.connected = false;
    });

    //Handle incoming chat message
    socket.on('chat', function(message) {
        app.handleChat(message);
    });

    socket.on('registerResult',function(message){
        if(message == 'OK'){
            app.loggedIn = true;
        } else {
            app.error = message;
        }
    });

    socket.on('loginResult',function(message){
        if(message == 'OK'){
            app.loggedIn = true;
        } else {
            app.error = message;
        }
    });

    socket.on('promptSubmitResult',function(msg){
        app.error = msg;
    });

    socket.on('alreadyVoted',function(bool){
        app.alreadyVoted = bool;
    });

    socket.on('setPromptsSubmittedTo',function(bool){
        app.promptOneSubmitted = bool;
        app.promptTwoSubmitted = bool;
    });

    socket.on('error',function(err){
        app.error =err;
    });

    socket.on('resetAllVariables',function(){
        app.resetAllVariables();
    });
    
    socket.on('update',function(dat){
        if(dat.me.promptToAnswerTwo == ''){
            app.hasTwoPrompts = false;
        } else {
            app.hasTwoPrompts = true;
        }
        app.players = dat.players;
        app.me = dat.me;
        app.state = dat.state;
        app.promptsToAnswersAuthors = dat.promptsToAnswersAuthors;
        app.promptAnswerIndex = dat.promptCount;
        app.promptResults = dat.promptResults;

    });

}
