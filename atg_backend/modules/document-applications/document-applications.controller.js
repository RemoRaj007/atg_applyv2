const docAppService = require("./document-applications.service");
const ApiError = require("../../utils/ApiError");

const create = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { documentType, status, submissionDate } = req.body;

    if (!documentType) {
      throw ApiError.badRequest("Document type is required");
    }

    const app = await docAppService.create(userId, {
      documentType,
      status,
      submissionDate,
    });

    res.status(201).json({
      success: true,
      data: app,
    });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const apps = await docAppService.list(userId);
    res.json({
      success: true,
      data: apps,
    });
  } catch (error) {
    next(error);
  }
};

const listAll = async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "operator") {
      throw ApiError.forbidden("Only admins and operators can view all applications");
    }

    const apps = await docAppService.listAll();
    res.json({
      success: true,
      data: apps,
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const app = await docAppService.getById(id, userId);
    res.json({
      success: true,
      data: app,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updated = await docAppService.update(id, userId, req.body);
    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await docAppService.remove(id, userId);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  listAll,
  getById,
  update,
  remove,
};
