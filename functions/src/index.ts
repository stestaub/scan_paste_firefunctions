import * as functions from 'firebase-functions';
import * as firebaseAdmin from 'firebase-admin';

firebaseAdmin.initializeApp();

exports.cleanOldRequests = functions.pubsub.schedule('every 5 minutes')
    .onRun(() => {
        const now = new Date();
        const olderThan = new Date(new Date().setHours(now.getHours() - 1)).toISOString();
        const itemsToRemove = firebaseAdmin.database().ref("/request").orderByChild('created_at').endAt(olderThan);

        return itemsToRemove.once('value', (snapshot) => {
            const keys: string[] = [];
            snapshot.forEach(snap => {
                keys.push(<string>snap.key);
            });
            return deleteRecords(keys);
        });
    });

function deleteRecords(keys: string[]) {
    const data: { [key: string]: any } = {};
    keys.forEach((k: string) => {
        data['/request/' + k] = null;
    });
    return firebaseAdmin.database().ref().update(data);
}

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
    const notificationPriority: ('min' | 'low' | 'default' | 'high' | 'max') = 'max';
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
                tag: "scan_request",
                clickAction:  "OPEN_SCANNER",
                defaultSound: true,
                defaultVibrateTimings: true,
                channelId: "ch.innodirve.copyscan.ScanRequest",
                priority: notificationPriority,
            },
            priority: prio
        },
        token: registrationToken
    };

    return firebaseAdmin.messaging().send(message);
}
