const express = require('express');
const auth = express.Router()
const { authToSiam } = require('../utils/siam_request')
const response = require('../utils/response')
const studentsService = require('../repository/students')
const conselorService = require('../repository/conselour')
const jwt = require('../middleware/jwt_auth')
const bcrypt = require('bcrypt')
const { StatusCodes } = require('http-status-codes')

auth.post('/login-siam', async (req, res) => {
    const { nim, password, fcm_token } = req.body

    // Auth to siam
    const result = await authToSiam(nim, password)

    if (!result) {
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "Password or Username is false")
    }

    const isStudentExist = await studentsService.isStudentExist(result.nim)
    const token = jwt.generateToken(result.nim, 1)

    if (!isStudentExist) {
        const student = await studentsService.createStudents(result.nim, result.nama, result.prodi, result.image, fcm_token)
        if (student) {
            return response.responseSuccess(res, StatusCodes.CREATED, { token: token }, "Success auth with siam")
        }
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail to create student")
    }

    return response.responseSuccess(res, StatusCodes.OK, { token: token }, "Success auth with siam")
})


auth.post('/login-konselor', async (req, res) => {

    //Kurang fcm token service
    const { email, password, fcm_token } = req.body

    const conselor = await conselorService.loginConselours(email, password)

    if (conselor == false) {
        return response.responseFailure(res, StatusCodes.UNAUTHORIZED, "Password don't match")
    }

    if (conselor == null) {
        return response.responseFailure(res, StatusCodes.BAD_REQUEST, "Email not found")
    }

    const token = jwt.generateToken(conselor.id, 0)

    const isFail = await conselorService.updateFcmToken(conselor.id, fcm_token)

    if (isFail == null) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail to login")
    }

    return response.responseSuccess(res, StatusCodes.OK, { token: token }, "Login success")
})

auth.post('/register-conselour-dummy', async (req, res) => {
    const { name, email, password, major, profile_image_url, fcm_token } = req.body

    const conselor = await conselorService.createCounselor(name, email, password, major, profile_image_url, fcm_token)
    if (conselor == null) {
        return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail to save conselor")
    }

    const token = jwt.generateToken(conselor.id)

    return response.responseSuccess(res, StatusCodes.CREATED, { token: token }, "Success create conselour")
})

auth.get('/logout', jwt.validateToken, async (req, res) => {
    //claims jwt
    const role = req.user.role
    const id = req.user.id

    if (role == 0){
        const data = await conselorService.updateFcmToken(id, null)
        if (!data){
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail to logout conselor")
        }
        return response.responseSuccess(res, StatusCodes.OK, null, "Success logout")
    }

    if (role == 1){
        const data = await studentsService.updateFcmToken(id, null)
        if (!data){
            return response.responseFailure(res, StatusCodes.INTERNAL_SERVER_ERROR, "Fail to logout conselor")
        }
        return response.responseSuccess(res, StatusCodes.OK, null, "Success logout")
    }
    return response.responseFailure(res, StatusCodes.BAD_REQUEST, "Fail logout")

})

module.exports = {
    auth
}

