const paymentOptionService = require("./payment-option.service");

const list = async (req, res, next) => {
  try {
    const role = req.user ? req.user.role : "visitor";
    const options = await paymentOptionService.list(role);
    res.json({
      status: true,
      message: "Payment options retrieved successfully",
      data: { options },
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const option = await paymentOptionService.getById(req.params.id);
    res.json({
      status: true,
      message: "Payment option retrieved successfully",
      data: { option },
    });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const option = await paymentOptionService.create(req.body);
    res.status(201).json({
      status: true,
      message: "Payment option created successfully",
      data: { option },
    });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const option = await paymentOptionService.update(req.params.id, req.body);
    res.json({
      status: true,
      message: "Payment option updated successfully",
      data: { option },
    });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await paymentOptionService.remove(req.params.id);
    res.json({
      status: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
