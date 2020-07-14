const Rcon = require('rcon-client');
const Discord = require('discord.js')
const client = new Discord.Client()
const ping = require('minecraft-server-util');
require('dotenv').config()

// RCON imports
let prefix = '!'
const {connect} = require('source-rcon-lib');
const {send} = require('source-rcon-lib');
const {disconnect} = require('source-rcon-lib');

// Setting up servers database
var Datastore = require('nedb');
var servers = new Datastore({ filename: 'servers.txt' });
servers.ensureIndex({ fieldName: 'name', unique: true });

client.on('ready', () => {
    console.log("Connected as " + client.user.tag)
    servers.loadDatabase(function (error) {   
        if (error) {
            console.log('FATAL: local database could not be loaded. Caused by: ' + error);
            throw error;
          }
          console.log('INFO: local database loaded successfully.');
      });
})

let bot_secret_token = process.env.TOKEN;

client.login(bot_secret_token)

client.on('message', (receivedMessage) => {
    if (receivedMessage.author == client.user) { // Prevent bot from responding to its own messages
        return
    }
    
    if (receivedMessage.content.startsWith(prefix)) {
        processCommand(receivedMessage)
    }
})

function processCommand(receivedMessage) {
    let fullCommand = receivedMessage.content.substr(1) // Remove the leading exclamation mark
    let splitCommand = fullCommand.split(" ") // Split the message up in to pieces for each space
    let primaryCommand = splitCommand[0] // The first word directly after the exclamation is the command
    let arguments = splitCommand.slice(1) // All other words are arguments/parameters/options for the command

    console.log("Command received: " + primaryCommand)
    console.log("Arguments: " + arguments) // There may not be any arguments

    if (primaryCommand == "status") {
        status(receivedMessage, arguments[0], arguments[1])
    } else if (primaryCommand == "invite") {
        receivedMessage.channel.send("https://discord.com/oauth2/authorize?client_id=731629626421411870&permissions=0&scope=bot")
    } else if (primaryCommand == "add") {
        addServer(receivedMessage, arguments[0], arguments[1], arguments[2], arguments[3])
    } else if (primaryCommand == "remove") {
        removeServer(receivedMessage, arguments[0])
    } else if (primaryCommand == "connect") {
        rconConnect(receivedMessage, arguments[0], arguments[1], arguments[2])
    } else if (primaryCommand == "command") {
        command(receivedMessage, arguments[0], arguments.slice(1))
    } else if (primaryCommand == "disconnect") {
        rconDisconnect(receivedMessage)
    } else if (primaryCommand == "prefix") {
        changePrefix(receivedMessage, arguments[0])
    }else {
        receivedMessage.channel.send("I don't understand the command. Try `!help`")
    }
}

//Outputs how many players are online the server to the channel
function status(receivedMessage, ip, port = 25565) {
    if (servers[ip] != undefined) {
        port = servers[ip].port
        ip = servers[ip].ip
    }
    console.log(typeof ip)
    ping(ip, parseInt(port))
    .then((data) => {
        const embed = new Discord.MessageEmbed()
        .setTitle('Server Status')
        .setColor(0xbada55)
        .setDescription("Online: " + data.onlinePlayers + " / " + data.maxPlayers + "\nIP: " + data.host + ":" + data.port + 
        "\nDesciption: " + mcTextParser(data.descriptionText));
        receivedMessage.channel.send(embed)
    })
    .catch((error) => {
        receivedMessage.channel.send("Could not reach server")
        throw error;
    });
}


function addServer(receivedMessage, name, ip, port = 25565, rconport = 25575) {

    if (name == undefined) {
        const embed = new Discord.MessageEmbed()
            .setTitle('Please provide a server name')
            .setColor(0xff0000)
            .setDescription('!add <servername> <ip> <port>');
        receivedMessage.channel.send(embed)
    } else if (ip == undefined) {
        const embed = new Discord.MessageEmbed()
            .setTitle('Please provide an IP')
            .setColor(0xff0000)
            .setDescription('!add <servername> <ip> <port>');
        receivedMessage.channel.send(embed)
    } else {
        var server = {
            name: name,
            ip: ip,
            port: parseInt(port),
            rconport: parseInt(rconport)
        };
        servers.findOne({name: name}, function(err, docs) { 
            if (null === docs) {
               servers.insert(server, function (err) {});
               const embed = new Discord.MessageEmbed()
                .setTitle('Added ' + server.name)
                .setColor(0xbada55)
                .setDescription("IP: " + server.ip + ":" + server.port);

            receivedMessage.channel.send(embed)
            console.log('Saved server:', server.name);
            console.log("\tip:", server.ip)
            console.log("\tport:", server.port)
            console.log("\trconport:", server.rconport)
            
            } else {
                const embed = new Discord.MessageEmbed()
                .setTitle('Server already exists')
                .setColor(0xff0000)
                console.log('Server already exists');
                receivedMessage.channel.send(embed)}
            }
        )
    }
}



// function addServer(receivedMessage, name, ip, port = 25565, rconport = 25575) {

//     if (name == undefined) {
//         const embed = new Discord.MessageEmbed()
//             .setTitle('Please provide a server name')
//             .setColor(0xff0000)
//             .setDescription('!add <servername> <ip> <port>');
//         receivedMessage.channel.send(embed)
//     } else if (ip == undefined) {
//         const embed = new Discord.MessageEmbed()
//             .setTitle('Please provide an IP')
//             .setColor(0xff0000)
//             .setDescription('!add <servername> <ip> <port>');
//         receivedMessage.channel.send(embed)
//     } else {
//         var server = {
//             name: name,
//             ip: ip,
//             port: parseInt(port),
//             rconport: parseInt(rconport)
//         };
//         if (servers[name] == undefined) {
//             servers[name] = server

//             const embed = new Discord.MessageEmbed()
//                 .setTitle('Added ' + server.name)
//                 .setColor(0xbada55)
//                 .setDescription("IP: " + server.ip + ":" + server.port);

//             receivedMessage.channel.send(embed)
//             console.log(servers)
//         } else {
//             const embed = new Discord.MessageEmbed()
//                 .setTitle('Server already exists')
//                 .setColor(0xff0000)
//             receivedMessage.channel.send(embed)
//         }
//     }
// }

function removeServer(receivedMessage, name) {
    
    if (name == undefined) {
        const embed = new Discord.MessageEmbed()
            .setTitle('Please provide a server name')
            .setColor(0xff0000)
            .setDescription('!remove <servername>');
        receivedMessage.channel.send(embed)
    } else {
        servers.remove({ name: name }, function(err, numDeleted) {
            if (numDeleted == 1) {
                console.log('Deleted', name);
                const embed = new Discord.MessageEmbed()
                    .setTitle("Server \"" + name + "\" removed")
                    .setColor(0xbada55)
        
                receivedMessage.channel.send(embed)
            } else {
                const embed = new Discord.MessageEmbed()
                    .setTitle('Server does not exist')
                    .setColor(0xff0000)
                receivedMessage.channel.send(embed)
                console.log('Delete failed');
            }
       });
        

    } 
}

function rconConnect(receivedMessage, password, ip, port = 25575) {
    if (servers[ip] != undefined) {
        port = servers[ip].rconport
        ip = servers[ip].ip
    }
    connect(ip, parseInt(port), password)
        .then(() => console.log('connected'))
        .catch(err => console.error(err));
}

function command(receivedMessage, command, arguments) {
    arguments.forEach(element => {
        command += " " + element
    });
    send(command)
    .then(res => console.log(mcTextParser(res)))
    .catch(err => console.error(err));
}

function rconDisconnect(receivedMessage) {
    disconnect()
    .then(() => console.log('disconnected'))
    .catch(err => console.error(err));
}

function changePrefix(receivedMessage, newPrefix) {
    if (newPrefix == undefined) {
        const embed = new Discord.MessageEmbed()
            .setTitle('Please provide a single character prefix')
            .setColor(0xff0000)
            .setDescription('!prefix <newprefix>')
        receivedMessage.channel.send(embed)
    } else if (newPrefix.length == 1) {
        const embed = new Discord.MessageEmbed()
            .setTitle('Prefix changed from \'' + prefix + '\' to \'' + newPrefix + '\'')
            .setColor(0xbada55)
        receivedMessage.channel.send(embed)
        prefix = newPrefix
    } else {
        const embed = new Discord.MessageEmbed()
            .setTitle('Prefix can only be a single character')
            .setColor(0xff0000)
        receivedMessage.channel.send(embed)
    }
}

function mcTextParser(text) {
    text = text.replace(/B'\w/g, "")
    text = text.replace(/§\w/g, "")
    return text
}