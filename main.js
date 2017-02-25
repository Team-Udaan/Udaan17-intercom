/**
 * Created by maunil on 23-02-2017.
 */

var allPeers = [];
var peerInfo = {};
var webrtc = null;
var onCall = false;
var currentPeer = null;
var callingTimeout = null;
var username = "";

// navigator.serviceWorker.register('/worker.js').then(function(registration){
//     registration.showNotification("Test", {
//         body: "This is a test."
//     });
// });

// var incomingCallNotification =  new Notification("Test", {
//     body: "This is a test."
// });


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


function init() {

    peerInfo.username = username;
    webrtc = new SimpleWebRTC({
        url: 'https://' + location.hostname + ":8888",
        autoRequestMedia: false,
        nick: username,
        options: {video: false, audio: false}
    });
    webrtc.joinRoom('idle');
    webrtc.on('createdPeer', function (peer) {
        setTimeout(function () {
            updatePeerList();
        }, 1000);
    });
    webrtc.connection.on('remove', function () {
        updatePeerList();
    });
    $('#cancel').click(function () {
        currentPeer.send('canceled', 'canceled');
        closeModal('calling-modal');
        onCall = false;
    });

    function updatePeerList() {
        allPeers = webrtc.webrtc.peers;
        var handlebarsData = allPeers.map(function (data) {
            return {id: data.id, nick: data.nick, initial: Math.random()}
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
            setTimeout(function () {
                onCall = false;
                closeModal('calling-modal');
            }, 10000);
        });
    }
    webrtc.connection.on('message', function (data) {
        if (data.type == 'calling') {
            if (onCall) {
                peer = findPeer(data.payload.sender);
                peer.send('rejected', 'busy');
            }
            else {
                onCall = true;

                openModal('receiving-modal');
                alert('Incoming call');
                // setTimeout(function () {
                //     closeModal('receiving-modal');
                //     onCall = false;
                // }, 10000);
                $('#accept').click(function () {
                    peer = findPeer(data.payload.sender);
                    peer.send('accepted', data.payload.sender);
                    page('/activePage.html?' + data.payload.sender);
                });
                $('#reject').click(function () {
                    closeModal('receiving-modal');
                    peer = findPeer(data.payload.sender);
                    peer.send('rejected', 'rejected');
                    onCall = false;
                });
            }
        }
        if (data.type == 'accepted') {
            page('/activePage.html?' + data.payload);
        }
        if (data.type == 'rejected') {
            var modalHeading = $('#calling-modal .modal-content h4');

            modalHeading.html('Rejected');
            clearTimeout(callingTimeout);
            setTimeout(function () {
                closeModal('calling-modal');
                modalHeading.html('Calling');
            }, 3000);
            onCall = false;
        }
        if (data.type == 'canceled') {
            closeModal('receiving-modal');
            onCall = false;
        }
    })
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
