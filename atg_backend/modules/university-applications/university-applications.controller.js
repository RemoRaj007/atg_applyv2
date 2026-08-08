const uniAppService = require("./university-applications.service");
const ApiError = require("../../utils/ApiError");

const create = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { universityName, programName, applicationStatus, submissionDate } = req.body;

    if (!universityName || !programName) {
      throw ApiError.badRequest("University name and program name are required");
    }

    const app = await uniAppService.create(userId, {
      universityName,
      programName,
      applicationStatus,
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
    const apps = await uniAppService.list(userId);
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

    const apps = await uniAppService.listAll();
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

    if (req.user.role !== "admin" && req.user.role !== "operator") {
      const app = await uniAppService.getById(id, userId);
      return res.json({
        success: true,
        data: app,
      });
    }

    const app = await uniAppService.getById(id, userId);
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

    const updated = await uniAppService.update(id, userId, req.body);
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

    const result = await uniAppService.remove(id, userId);
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
