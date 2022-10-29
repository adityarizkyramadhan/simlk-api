const { firebaseApp } = require('./firebase_connection')
const serviceConselour = require('../repository/conselour')


//bikin function
const sendNotif = (fcmToken, title, body, dataNotif) => {
    return firebaseApp.messaging().sendToDevice(fcmToken, {
        notification: {
            title: title,
            body: body,
        },
        data: { dataNotif },
    }).then(function (dataSend) {
        console.log(dataSend)
        return dataSend
    }).catch(function (err) {
        console.log(err)
        return null
    })
}

const sendNotifToAll = async (title, body, data) => {
    const dataConselour = await serviceConselour.getAllToken()

    if (!dataConselour) {
        return null
    }

    const tokens = []

    for (i = 0; i < dataConselour.length; i++) {
        if (dataConselour[i].fcm_token == null) continue
        else tokens[i] = dataConselour[i].fcm_token
    }

    return firebaseApp.messaging().sendMulticast({
        notification: {
            title: title,
            body: body,
        },
        data: data,
        tokens: tokens
    }).then(function (dataSendNotif) {
        return dataSendNotif
    }).catch(function (err) {
        console.log(err)
        return null
    })
}

module.exports = {
    sendNotif,
    sendNotifToAll
}
