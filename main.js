/**
 * Created by maunil on 23-02-2017.
 */
//todo: add name while calling someone
window.onload = initAudio;
var context;
var bufferLoader;
var source1;
var allPeers = [];
var peerInfo = {};
var webrtc = null;
var onCall = false;
var currentPeer = null;
var callingTimeout = null;
var receivingTimeout = null;
var username = "";

function findPeer(id) {
    return allPeers.find(function (obj) {
        return obj.id == id;
    });
}
function openModal(id) {
    var modal = document.getElementById(id);
    modal.style.display = "block";
}
function closeModal(id) {
    var modal = document.getElementById(id);
    modal.style.display = "none";
}
function initAudio() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
    bufferLoader = new BufferLoader(
        context,
        ['./ring.mp3'],
        finishedLoading
    );
    bufferLoader.load();
    return 'loaded';
}
function finishedLoading(bufferList) {
    // Create two sources and play them both together.
    console.log(bufferList);
    source1 = context.createBufferSource();
    source1.buffer = bufferList[0];
    source1.connect(context.destination);
}
function playAudio() {
    source1.start(0);
}
function stopAudio() {
    source1.stop(0);
    initAudio();
}

function init() {
    peerInfo.username = username;
    webrtc = new SimpleWebRTC({
        url: 'https://' + location.hostname + ":8888",
        autoRequestMedia: false,
        nick: username,
        options: {video: false, audio: false}
    });
    webrtc.joinRoom('idle');
    webrtc.connection.on('message', function (msg) {
        if (msg.type == 'offer' || msg.type == 'answer') {
            updatePeerList();
        }
    });
    webrtc.connection.on('remove', function () {
        updatePeerList();
    });
    $('#cancel').click(function () {
        currentPeer.send('canceled', 'canceled');
        closeModal('calling-modal');
        onCall = false;
        clearTimeout(callingTimeout);
        clearTimeout(receivingTimeout);
        $('#calling-modal .modal-content .name').html('Calling');
    });

    function updatePeerList() {
        allPeers = webrtc.webrtc.peers;
        var handlebarsData = allPeers.map(function (data) {
            return {id: data.id, nick: data.nick, initial: 'NA'/*data.nick.charAt(0)*/}
        });
        var peerListTemplate = Handlebars.templates['calling-buttons']({'allPeers': handlebarsData});
        $('#peers').html(peerListTemplate);
        var colors = [
            '#64b5f6',//blue
            '#7986cb',//indigo
            '#e57373',//red
            '#ba68c8',//purple
            '#4db6ac',//teal
            '#dce775',//yellow
            '#81c784',//green
            '#ffb74d',//orange
            '#a1887f'//brown
        ];
        var currentIndex = 0;
        $('.circle').each(function () {
            currentIndex = (currentIndex + 1) % colors.length;
            var color = colors[currentIndex];
            $(this).css("background-color", color);
        });
        $('.call').click(function () {
            var id = $(this).data('id');
            currentPeer = allPeers.find(function (obj) {
                return obj.id == id;
            });
            onCall = true;
            currentPeer.send('calling', {
                'sender': webrtc.connection.connection.id
            });
            openModal('calling-modal');
            callingTimeout = setTimeout(function () {
                onCall = false;
                closeModal('calling-modal');
            }, 10000);
        });
    }

    webrtc.connection.on('message', function (data) {
        if (data.type == 'calling') {
            if (onCall) {
                var peer = findPeer(data.payload.sender);
                peer.send('rejected', 'busy');
            }
            else {
                onCall = true;
                var peerNick = findPeer(data.payload.sender).nick;
                $('#receiving-modal .name').html(peerNick);
                openModal('receiving-modal');
                // clearTimeout(receivingTimeout);
                receivingTimeout = setTimeout(function () {
                    closeModal('receiving-modal');
                    onCall = false;
                    stopAudio();
                }, 10000);
                $('#accept').click(function () {
                    onCall = true;
                    peer = findPeer(data.payload.sender);
                    peer.send('accepted', data.payload.sender);
                    page('/activePage.html?' + data.payload.sender);
                });
                $('#reject').click(function () {
                    onCall = false;
                    clearTimeout(callingTimeout);
                    clearTimeout(receivingTimeout);
                    closeModal('receiving-modal');
                    peer = findPeer(data.payload.sender);
                    peer.send('rejected', 'rejected');
                    stopAudio();
                });
                playAudio();
            }
        }
        if (data.type == 'accepted') {
            onCall = true;
            page('/activePage.html?' + data.payload);
        }
        if (data.type == 'rejected') {
            onCall = false;
            var modalHeading = $('#calling-modal .modal-content .name');
            modalHeading.html('Rejected');
            clearTimeout(callingTimeout);
            clearTimeout(receivingTimeout);
            receivingTimeout = setTimeout(function () {
                onCall = false;
                clearTimeout(callingTimeout);
                closeModal('calling-modal');
                modalHeading.html('Calling');
            }, 3000);
        }
        if (data.type == 'canceled') {
            clearTimeout(callingTimeout);
            clearTimeout(receivingTimeout);
            onCall = false;
            closeModal('receiving-modal');
            stopAudio();
        }
    });
}


$(document).ready(function () {

    username = localStorage.getItem('username');
    var encodedUsername = location.search.slice(1);

    if (encodedUsername == '' && username == null) {
        openModal('error');
        window.close();
    }

    else if (username == null || username == '') {
        username = atob(encodedUsername);
        localStorage.setItem('username', username);
        location.reload();
    }
    else {
        init();
    }
});
