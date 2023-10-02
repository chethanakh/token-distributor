require('dotenv').config();
const WebSocket = require("ws");
const fs = require("fs");
const querystring = require("querystring");
const express = require('express');
const app = express()
const server = require('http').Server(app)
app.set('view engine', 'ejs')
app.use(express.static('public'))

const WsResponse = require('./DTO/WsResponse');

const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';
const adminUserNAme = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || '1234';


var connectionList = [];

server.listen(port, () => {
    console.log("Server Started on " + port)
})

const wss = new WebSocket.Server({
    server,
    path: "/ws"
});


app.get('/', (req, res) => {
    res.render('index', { "PORT": port, "HOST": host })
})

app.get('/admin', (req, res) => {
    res.render('admin', { "PORT": port, "HOST": host })
})

let rawData = fs.readFileSync('./team-info.json');
const userArr = JSON.parse(rawData);
var sendableTeamArr = {};

userArr[adminUserNAme] = {
    password: adminPassword
};

wss.on("connection", function (ws, req) {
    try {
        const qParams = querystring.parse(req.url.split("?")[1]) ?? null;

        var userName = qParams.user_name ?? "";
        var passWord = qParams.password ?? "";
        var isAdmin = false;

        if (!userArr[userName]) {
            ws.send(new WsResponse('UN_AUTHORIZED', [], 401).toJsonString());
            ws.close();
        }
        if (userArr[userName].password != passWord) {
            ws.send(new WsResponse('UN_AUTHORIZED', [], 401).toJsonString());
            ws.close();
        }
        if (userName == adminUserNAme) {
            isAdmin = true;
            Object.keys(userArr).forEach(team => {
                isActive = false;
                if (connectionList.hasOwnProperty(team)) {
                    isActive = true;
                }
                sendableTeamArr[team] = { ...userArr[team], is_active: isActive, token: "N/A" }
            });
            delete sendableTeamArr[adminUserNAme];
        } else {
            sendToAdmin(new WsResponse('TEAM_JOINED', { user_name: userName }, 200).toJsonString())
        }

        connectionList[userName] = ws;


        console.log("connected", [userName, isAdmin]);
        ws.send(new WsResponse('AUTHORIZED', {
            user: userArr[userName],
            is_admin: isAdmin,
            available_team: sendableTeamArr
        }, 200).toJsonString());
    } catch (error) {
        console.error(error);
        ws.send(new WsResponse('UN_AUTHORIZED', [], 401).toJsonString());
        ws.close();
    }

    ws.on("message", function (msg) {
        try {
            if (isAdmin) {
                var payload = msg.toString("utf8");
                processAdminSocketCommand(payload, ws);
            }

        } catch (error) {
            console.error(error);
        }
    })

    ws.on("close", function () {
        delete connectionList[userName];
        console.log(userName + " disconnect");

        if (!isAdmin) {
            sendToAdmin(new WsResponse('TEAM_LEFT', { user_name: userName }, 200).toJsonString())
        }
    })
})

function sendToAdmin(payload) {
    if (connectionList.hasOwnProperty(adminUserNAme)) {
        connectionList[adminUserNAme].send(payload);
    }
}

function processAdminSocketCommand(payload, ws) {
    payload = JSON.parse(payload);
    switch (payload.event) {
        case "GIVE_NUMBERS":
            giveNumbers();
            break;
        case "GIVE_NUMBERS_H":
            giveNumbersH();
            break;
        case "GET_LOGED_TEAM":
            sendLogedTeams(ws);
            break;
        case "BACK_TO_WAITING_SCREEN_REQUEST":
            sendBAckToWaitingScreenResponse();
            break;
        default:
            break;
    }
}


function giveNumbers() {
    var teamVsToken = {};
    teamArr = shuffle(Object.keys(connectionList));
    teamArr = removeAdmin(teamArr);
    var i = 1;
    teamArr.forEach(function (value, key) {
        teamVsToken[value] = i;
        connectionList[value].send(new WsResponse('CARD_NO_RECEIVED', { number: i }, 200).toJsonString());
        i++;
    })
    sendToAdmin(new WsResponse('CARD_NO_SENT', { team_vs_token: teamVsToken }, 200).toJsonString());

}

function giveNumbersH() {
    var teamVsToken = {};
    teamArr = shuffle(Object.keys(connectionList));
    teamArr = removeAdmin(teamArr);
    teamArr.forEach(function (value, key) {
        i = userArr[value].token
        teamVsToken[value] = i;
        connectionList[value].send(new WsResponse('CARD_NO_RECEIVED', { number: i }, 200).toJsonString());
    })
    sendToAdmin(new WsResponse('CARD_NO_SENT', { team_vs_token: teamVsToken }, 200).toJsonString());

}

function sendLogedTeams(ws) {
    availableTeam = Object.keys(connectionList);
    availableTeam = removeAdmin(availableTeam);
    var AvailableTeamListArr = []
    availableTeam.forEach(function (value, key) {
        AvailableTeamListArr.push(userArr[value].teamName);
    })
    ws.send(new WsResponse('AVAILABLE_TEAMS_LIST', { teams: AvailableTeamListArr }, 200).toJsonString());
}

function sendBAckToWaitingScreenResponse() {
    var teamVsToken = {};
    teamArr = shuffle(Object.keys(connectionList));
    teamArr = removeAdmin(teamArr);
    var i = 1;
    teamArr.forEach(function (value, key) {
        teamVsToken[value] = i;
        connectionList[value].send(new WsResponse('BACK_TO_WAITING_SCREEN', { number: i }, 200).toJsonString());
        i++;
    })
    sendToAdmin(new WsResponse('BACK_TO_WAITING_SCREEN_REQUEST_SENT', { team_vs_token: teamVsToken }, 200).toJsonString());
}

function removeAdmin(array) {
    var index = array.indexOf(adminUserNAme);
    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}