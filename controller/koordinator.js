const express = require('express');
const koordinatorController = express.Router()
const response = require('../utils/response')
const koordinatorService = require('../repository/koordinator')
const conseloursService = require('../repository/conselour')
const jwt = require('../middleware/jwt_auth')
const notifService = require('../repository/notifications_conselour')
const sendNotif = require('../utils/push_notification')
const { StatusCodes } = require('http-status-codes')
const { uploadToSupabase, generateLink } = require('../utils/supabase_storage')

koordinatorController.get('/profile', jwt.validateToken, async (req, res) => {
    let id = req.user.id
    var result = await koordinatorService.readById(id)
    if (result.error) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, result.error)
    }
    return response.responseSuccess(res, StatusCodes.OK, result.data, "Success Query")
})

// Menjadwalkan konselor ke reservasi
koordinatorController.get('/reservation/:idres/konselor/:idkon', jwt.validateToken, async (req, res) => {
    let idRes = req.params.idres
    let idKon = req.params.idkon
    let role = req.user.role
    if (role != 1) {
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "Unauthorized")
    }
    var result = await koordinatorService.selectKonselor(idRes, idKon, 3)
    if (result.error) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, result.error)
    }
    let data = result.data

    let reservasi = await conseloursService.getReservationById(idRes)

    let title = `Permintaan Bimbingan Konseling Baru ${reservasi.nim}`
    let body = `Terdapat permintaan bimbingan konseling baru yang diserahkan oleh konselor ahli`
    let notif = await notifService.createNotif(title, body, idRes, 2, idKon)
    if (!notif) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Sucess save in database but fail when save notif")
    }

    const conselor = await conseloursService.searchById(idKon)
    if (!conselor.fcm_token){
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Sucess save in database but fail when send notif")
    }
    const isSuccess = await sendNotif.sendNotif(conselor.fcm_token, title, body)

    if (!isSuccess) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Sucess save in database but fail when send notif")
    }

    return response.responseSuccess(res, StatusCodes.OK, { data }, "Success Update")
})

// Melihat reservasi yang diajukan
koordinatorController.get('/reservasi-diajukan', jwt.validateToken, async (req, res) => {
    let role = req.user.role
    if (role != 1) {
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "Unauthorized")
    }
    let result = await koordinatorService.findAllResAssign(2)
    console.log(result)
    if (result.error) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, result.error)
    }
    if (!result.data) {
        let data = result.data
        return response.responseSuccess(res, StatusCodes.OK, { data }, "Success Query")
    }
    return response.responseSuccess(res, StatusCodes.OK, result.data, "Success Query")
})

// Melihat konselor yang tersedia
koordinatorController.get('/conselor-tersedia/reservasi/:idres', jwt.validateToken, async (req, res) => {
    let role = req.user.role
    if (role != 1) {
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "Unauthorized")
    }
    let idRes = req.params.idres
    let result = await koordinatorService.getConselorPadaTanggalReservasi(idRes)
    if (result.error) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, result.error)
    }
    return response.responseSuccess(res, StatusCodes.OK, result.data, "Success Query")
})

//Mengisi jadwal ke konselor
koordinatorController.put('/jadwal/konselor', jwt.validateToken, async (req, res) => {
    let role = req.user.role
    if (role != 1) {
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "Unauthorized")
    }
    const { jadwal, id_konselor } = req.body
    let result = await conseloursService.updateJadwal(id_konselor, jadwal)

    if (!result) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail when query database")
    }

    result = null
    return response.responseSuccess(res, StatusCodes.OK, null, "Success update data from database")
})


//Lengkapi profile
koordinatorController.put('/profile', jwt.validateToken, async (req, res) => {
    const id = req.user.id
    const koorData = await koordinatorService.readById(id)
    const { nim, name } = req.body

    if (!req.files) {
        const updatedData = await koordinatorService.updateProfile(id, nim, name, koorData.profile_image_url)
        if (!updatedData) {
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail when update database")
        }
        return response.responseSuccess(res, StatusCodes.OK, null, "Success update profile")
    } else {
        const { avatar } = req.files
        let nameFile = `${nim}${avatar.name}`
        avatar.name = nameFile
        let link = generateLink(avatar.name)
        let status = await uploadToSupabase(avatar)
        if (!status) {
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail when upload image")
        }
        const updatedData = await koordinatorService.updateProfile(id, nim, name, link)
        if (!updatedData) {
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail when update database")
        }
        return response.responseSuccess(res, StatusCodes.OK, null, "Success update profile")
    }
})


module.exports = {
    koordinatorController
}
