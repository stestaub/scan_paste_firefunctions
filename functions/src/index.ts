import * as functions from 'firebase-functions';
import * as firebaseAdmin from 'firebase-admin';

firebaseAdmin.initializeApp();

exports.requestScan = functions.database.ref('/request/{requestId}')
    .onCreate((snapshot, context) => {
        // Grab the current value of what was written to the Realtime Database.
        const channel = snapshot.child("channel_id").val();
        return firebaseAdmin.database().ref("/channels/" + channel + "/device_id").once('value').then(
            (channelSnapshot) => {
                return sendMessage(channelSnapshot.val(), context.params.requestId);
            }
        );
    });

function sendMessage(registrationToken: string, requestId: string){
    const prio: ('high' | 'normal') = 'high';
    const message = {
        notification: {
            title: "Scan Anfrage",
            body: "Klicke auf die Benachrichtigung um den Scanner zu starten.",
        },
        data: {
            request_id: requestId
        },
        android: {
            ttl: 600,
            notification: {
                clickAction:  "OPEN_SCANNER",
            },
            priority: prio
        },
        token: registrationToken
    };

    return firebaseAdmin.messaging().send(message);
}
