const { koordinator } = require('../model/entity_model')
const bcrypt = require('bcrypt')
// const { Op } = require('sequelize');

const createKoordinator = async (email, password, name, profile_image_url, fcm_token) => {
    var returnData = { data: null, error: null }
    try {
        let enPass = bcrypt.hashSync(password, 10)
        const isCreated = await koordinator.create({
            email: email,
            password: enPass,
            name: name,
            role: 1,
            profile_image_url: profile_image_url,
            fcm_token: fcm_token
        })
        returnData.data = isCreated.dataValues
        return returnData
    } catch (error) {
        returnData.error = error
        returnData.data = null
        return returnData
    }
}

const readAll = async () => {
    var returnData = { data: null, error: null }
    try {
        const dataAll = await koordinator.findAll()
        returnData.data = dataAll
        return returnData
    } catch (error) {
        returnData.error = error
        returnData.data = null
        return returnData
    }
}

const readById = async (id) => {
    var returnData = { data: null, error: null }
    try {
        const dataId = await koordinator.findOne({
            where: {
                id: id,
            }
        })
        returnData.data = dataId
        return returnData
    } catch (error) {
        returnData.error = error
        returnData.data = null
        return returnData
    }
}

const update = async (id, profile_image_url, fcm_token, name, nim) => {
    var returnData = { data: null, error: null }
    if (!profile_image_url) {
        try {
            const dataId = await koordinator.update({
                fcm_token: fcm_token,
                name : name,
                nim : nim
            }, {
                where: {
                    id: id
                }
            })
            returnData.data = dataId.dataValues
            return returnData
        } catch (error) {
            returnData.error = error
            returnData.data = null
            return returnData
        }
    } else if (!fcm_token) {
        try {
            const dataId = await koordinator.update({
                profile_image_url: profile_image_url
            }, {
                where: {
                    id: id
                }
            })
            returnData.data = dataId.dataValues
            return returnData
        } catch (error) {
            returnData.error = error
            returnData.data = null
            return returnData
        }
    } else {
        try {
            const dataId = await koordinator.update({
                profile_image_url: profile_image_url,
                fcm_token: fcm_token
            }, {
                where: {
                    id: id
                }
            })
            returnData.data = dataId.dataValues
            return returnData
        } catch (error) {
            returnData.error = error
            returnData.data = null
            return returnData
        }
    }
}

const deleteKoordinator = async (id) => {
    var returnData = { data: null, error: null }
    try {
        const dataId = await koordinator.destroy({
            where: {
                id: id
            }
        })
        returnData.data = dataId.dataValues
        return returnData
    } catch (error) {
        returnData.error = error
        returnData.data = null
        return returnData
    }
}

module.exports = {
    createKoordinator,
    readAll,
    readAll,
    update,
    deleteKoordinator
}
