const { prisma } = require("../../config/db");
const { systemLogger, securityLogger } = require("../../config/atg_logger");
const { validateNIC, isValidPhone } = require("../../utils/validators");
const resolveFileUrl = require("../../utils/fileUrl");
const sanitizeUser = require("../../utils/sanitizeUser");

// These routes take req.body straight to Prisma. Ownership is decided by the
// session, so the client must never be able to supply the keys that carry it —
// or a primary key, which would let one user's write land on another's row.
const OWNERSHIP_KEYS = ["id", "userId", "user", "createdAt", "updatedAt", "d_status"];

const stripOwnershipKeys = (body) => {
  const clean = { ...body };
  for (const key of OWNERSHIP_KEYS) delete clean[key];
  return clean;
};

const getEntityModel = (entity) => {
  const map = {
    phones: "userPhone",
    addresses: "userAddress",
    academic: "userAcademicQualification",
    languages: "userLanguage",
    itskills: "userItSkill",
    other: "userOtherQualification",
    experiences: "userExperience",
    references: "userReference"
  };
  return map[entity];
};

exports.getJobRoles = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userJobRoles = await prisma.userJobRole.findMany({
      where: { userId },
      include: { jobRole: true }
    });
    res.json({ userJobRoles });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (Number.isNaN(userId)) {
      return res.status(400).json({ status: false, message: "Invalid user id" });
    }

    // Candidates may only read their own profile; staff read any. Without this
    // check any authenticated user could dump another user's identity documents.
    const isSelf = req.user.id === userId;
    const isStaff = ["admin", "operator"].includes(req.user.role);
    if (!isSelf && !isStaff) {
      securityLogger.security("Blocked cross-user profile read", {
        requesterId: req.user.id,
        targetUserId: userId,
      });
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        phones: true,
        addresses: true,
        academicQualifications: true,
        languages: true,
        itSkills: true,
        documents: true,
        otherQualifications: true,
        experiences: { orderBy: { startDate: 'desc' } },
        references: true,
        userJobRoles: {
          include: { jobRole: true }
        }
      }
    });

    if (!user) return res.status(404).json({ status: false, message: "User not found" });

    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
};

exports.updatePersonal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = stripOwnershipKeys(req.body);
    if (data.dob) {
      data.dob = new Date(data.dob).toISOString();
    }

    if (data.nic || data.nationalId) {
      const userObj = await prisma.user.findUnique({ where: { id: userId } });
      const countryToUse = data.country || userObj?.country;
      const nicCheck = validateNIC(data.nic || data.nationalId, countryToUse);
      if (!nicCheck.isValid) {
        return res.status(400).json({ error: nicCheck.message });
      }
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { ...data, userId }
    });

    res.json({ message: "Personal information updated", profile });
  } catch (error) {
    next(error);
  }
};

exports.addEntity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { entity } = req.params;
    const model = getEntityModel(entity);

    if (!model) return res.status(400).json({ error: "Invalid entity" });

    let data = { ...stripOwnershipKeys(req.body), userId };

    if (model === "userPhone" && data.phoneNumber) {
      if (!isValidPhone(data.phoneNumber)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
    }
    if (model === "userAcademicQualification") {
      if (data.fromDate) data.fromDate = new Date(data.fromDate).toISOString();
      if (data.toDate) data.toDate = new Date(data.toDate).toISOString();
    }
    if (model === "userExperience") {
      // Handle startDate - required field
      if (data.startDate && data.startDate.trim()) {
        data.startDate = new Date(data.startDate).toISOString();
      } else {
        delete data.startDate; // let Prisma default or fail with clear error
      }
      // Handle endDate - optional field; empty string must become null
      if (data.endDate && data.endDate.trim()) {
        data.endDate = new Date(data.endDate).toISOString();
      } else {
        data.endDate = null;
      }
      // Coerce isCurrent from any type to boolean
      if (typeof data.isCurrent === 'string') {
        data.isCurrent = data.isCurrent === 'true';
      } else {
        data.isCurrent = !!data.isCurrent;
      }
    }

    let skillCategory = null;
    let skillName = null;

    if (model === "userItSkill" && data.description) {
      skillCategory = 'it';
      skillName = data.description;
    } else if (model === "userOtherQualification" && data.description) {
      skillCategory = 'other';
      skillName = data.description;
    } else if (model === "userLanguage" && data.language) {
      skillCategory = 'language';
      skillName = data.language;
    }

    if (skillName && skillCategory) {
      const existingSkill = await prisma.skill.findUnique({ where: { name: skillName } });
      if (!existingSkill) {
        await prisma.skill.create({
          data: {
            name: skillName,
            category: skillCategory,
            status: 'pending'
          }
        });
      }
    }

    const newRecord = await prisma[model].create({
      data
    });

    res.json({ message: `${entity} added`, record: newRecord });
  } catch (error) {
    next(error);
  }
};

exports.updateEntity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { entity, id } = req.params;
    const model = getEntityModel(entity);

    if (!model) return res.status(400).json({ error: "Invalid entity" });

    // Ensure record belongs to user
    const record = await prisma[model].findUnique({ where: { id: parseInt(id) } });
    if (!record || record.userId !== userId) {
      return res.status(404).json({ error: "Record not found" });
    }

    let data = stripOwnershipKeys(req.body);
    if (model === "userAcademicQualification") {
      if (data.fromDate) data.fromDate = new Date(data.fromDate).toISOString();
      if (data.toDate) data.toDate = new Date(data.toDate).toISOString();
    }
    if (model === "userExperience") {
      if (data.startDate && data.startDate.trim()) {
        data.startDate = new Date(data.startDate).toISOString();
      }
      if (data.endDate && data.endDate.trim()) {
        data.endDate = new Date(data.endDate).toISOString();
      } else {
        data.endDate = null;
      }
      if (typeof data.isCurrent === 'string') {
        data.isCurrent = data.isCurrent === 'true';
      } else {
        data.isCurrent = !!data.isCurrent;
      }
    }

    const updated = await prisma[model].update({
      where: { id: parseInt(id) },
      data
    });

    res.json({ message: `${entity} updated`, record: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteEntity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { entity, id } = req.params;
    const model = getEntityModel(entity);

    if (!model) return res.status(400).json({ error: "Invalid entity" });

    const record = await prisma[model].findUnique({ where: { id: parseInt(id) } });
    if (!record || record.userId !== userId) {
      return res.status(404).json({ error: "Record not found" });
    }

    await prisma[model].delete({ where: { id: parseInt(id) } });

    res.json({ message: `${entity} deleted` });
  } catch (error) {
    next(error);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { docType } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = resolveFileUrl(req.file);
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    const doc = await prisma.userDocument.create({
      data: {
        userId,
        docType,
        fileUrl,
        fileName,
        fileSize
      }
    });

    if (docType === "Profile Picture") {
      await prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: fileUrl }
      });
    }

    res.json({ message: "Document uploaded successfully", document: doc });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const record = await prisma.userDocument.findUnique({ where: { id: parseInt(id) } });
    if (!record || record.userId !== userId) {
      return res.status(404).json({ error: "Record not found" });
    }

    await prisma.userDocument.delete({ where: { id: parseInt(id) } });

    if (record.docType === "Profile Picture") {
      await prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: null }
      });
    }

    res.json({ message: "Document deleted" });
  } catch (error) {
    next(error);
  }
};

exports.updateJobRoles = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { jobRoleIds } = req.body;

    if (!Array.isArray(jobRoleIds)) {
      return res.status(400).json({ error: "jobRoleIds must be an array" });
    }

    // First delete existing job roles for user
    await prisma.userJobRole.deleteMany({
      where: { userId }
    });

    // Then insert the new ones
    if (jobRoleIds.length > 0) {
      const data = jobRoleIds.map(id => ({
        userId,
        jobRoleId: id
      }));
      await prisma.userJobRole.createMany({ data });
    }

    // Fetch the updated user job roles
    const updatedUserJobRoles = await prisma.userJobRole.findMany({
      where: { userId },
      include: { jobRole: true }
    });

    res.json({ message: "Job roles updated", userJobRoles: updatedUserJobRoles });
  } catch (error) {
    next(error);
  }
};
