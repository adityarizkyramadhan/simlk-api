const express = require('express');
const reservationsSchedule = express.Router()
const response = require('../utils/response')
const reservationsService = require('../repository/reservations')
const studentsService = require('../repository/students')
const jwt = require('../middleware/jwt_auth')
const { StatusCodes } = require('http-status-codes')
const sendNotif = require('../utils/push_notification')
const date = require('../utils/date_format')
const notifService = require('../repository/notifications_conselour')
const uploadFile = require('../utils/supabase_storage')
const generateLink = require('../utils/link_image');
const conselorService = require('../repository/conselour')


reservationsSchedule.post('/', jwt.validateToken, async (req, res) => {
    const nim = req.user.id

    const { reservation_time, time_hours, description, type } = req.body

    const dataIsExist = await reservationsService.getReservationsByDate(reservation_time)

    if (dataIsExist.length != 0) {
        for (i = 0; i < dataIsExist.length; i++) {
            if (dataIsExist[i].time_hours == time_hours) return response.responseFailure(res, StatusCodes.BAD_REQUEST, "Failed save in database because already booked")
        }
    }

    console.log(dataIsExist)

    const data = await reservationsService.createReservation(nim, reservation_time, time_hours, description, type)
    if (!data) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed save in database")
    }

    const reservation = await reservationsService.getReservationFromTimeAndNim(nim, reservation_time, time_hours)

    let title = "Permintaan Bimbingan Konseling Baru"
    let body = `${nim} membuat permintaan reservasi baru. Mohon untuk segera di proses`
    let notif = await notifService.createNotif(title, body, reservation.id)

    if (!notif) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Sucess save in database but fail when save notif")
    }
    const isSuccess = await sendNotif.sendNotifToAll(title, body)

    if (!isSuccess) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Sucess save in database but fail when send notif")
    }

    console.log(isSuccess)

    return response.responseSuccess(res, StatusCodes.CREATED, null, "success save to database")
})

//Ambil buat kalender
reservationsSchedule.get('/', jwt.validateToken, async (req, res) => {
    const data = await reservationsService.reservationSchedule()
    if (!data) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed query in database")
    }

    return response.responseSuccess(res, StatusCodes.OK, data, "success query database")
})

reservationsSchedule.get('/:id', jwt.validateToken, async (req, res) => {
    let id = req.params.id
    console.log(id)
    let role = req.user.role
    console.log(role)
    var temp
    if (role == 1) {
        var data = await reservationsService.getById(id)
        if (!data) {
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed query in database")
        }
        if (data.id_conselour){
            var conselour = await conselorService.searchById(data.id_conselour)
            var temp2 = data.dataValues
            temp = {...temp2, conselour}
        }
        if (temp == null) return response.responseSuccess(res, StatusCodes.OK, data, "success query data in database")
        return response.responseSuccess(res, StatusCodes.OK, temp, "success query data in database")
    } else if (role == 0) {
        const data = await reservationsService.getByIdAndProfile(id)
        if (!data) {
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed query in database")
        }
        return response.responseSuccess(res, StatusCodes.OK, data, "success query data in database")
    }
    return response.responseSuccess(res, StatusCodes.BAD_REQUEST, null, "Bad request")
})

reservationsSchedule.delete('/:id', jwt.validateToken, async (req, res) => {
    let id = req.params.id
    let role = req.user.role

    if (role == 1) {
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "You unauthorized to delete data")
    }
    const data = await reservationsService.deleteById(id)

    if (!data) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed query in database")
    }

    return response.responseSuccess(res, StatusCodes.OK, data, "success delete data in database")
})

reservationsSchedule.put('/:id', jwt.validateToken, async (req, res) => {
    let role = req.user.role
    let idData = req.params.id
    let idConselour = req.user.id

    if (role == 1) {
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "You unauthorized to edit data")
    }

    const reservasi = await reservationsService.getById(idData)

    if (reservasi.id_conselour != idConselour){
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "You unauthorized to edit data")
    }

    const { report } = req.body

    var file_report

    if (req.files){
        file_report = req.files.file_report
    }else {
        file_report = null
    }

    console.log(report)
    var data

    console.log(file_report!=null && report!=null)


    if (file_report && report){
        const up = uploadFile.uploadToSupabase(file_report)
        if (!up){
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail upload file")
        }
        var link = generateLink.generateLink(file_report.name)

        data = await reservationsService.updateReport(idData, report)
        data = await reservationsService.updateFileReport(idData, link)
    }

    if (!file_report){
        data = await reservationsService.updateReport(idData, report)
    }


    if(file_report){
        const up = uploadFile.uploadToSupabase(file_report)
        if (!up){
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail upload file")
        }
        var link = generateLink.generateLink(file_report.name)
        data = await reservationsService.updateFileReport(idData, link)
    }



    const students = await studentsService.getProfile(reservasi.nim)

    let fcm = students.fcm_token


    if (fcm) {
        console.log(fcm)
        let tanggal_reservasi = date.formatDate(reservasi.reservation_time)
        tanggal_reservasi = tanggal_reservasi + " " + reservasi.time_hours
        let isSuccess = await sendNotif.sendNotif(fcm, "Bimbingan Konseling Telah Selesai", `Konselor telah selesai menulis laporan akhir sesi bimbingan konseling pada tanggal ${tanggal_reservasi}.`, "data")
        if (!isSuccess) {
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Sucess save in database but fail when send notif")
        }
    }

    if (!data) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed update report")
    }

    return response.responseSuccess(res, StatusCodes.OK, null, "Success update report")
})


reservationsSchedule.get('/reservation-date/:date', jwt.validateToken, async (req, res) => {
    const date = req.params.date
    const data = await reservationsService.getReservationsByDate(date)
    if (!data) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failure query database")
    }
    return response.responseSuccess(res, StatusCodes.OK, data, "Success query")
})

module.exports = {
    reservationsSchedule
}
