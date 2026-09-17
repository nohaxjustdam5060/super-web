const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Claim } = require('../models');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

/**
 * Generate unique annual claim code: REC-YYYY-XXXX (e.g. REC-2026-0001)
 */
async function generateClaimCode(transaction = null) {
  const currentYear = new Date().getFullYear();
  const prefix = `REC-${currentYear}-`;

  // Find the last claim code for the current year
  const lastClaim = await Claim.findOne({
    where: {
      claim_code: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['created_at', 'DESC'], ['claim_code', 'DESC']],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined
  });

  let nextSequence = 1;

  if (lastClaim && lastClaim.claim_code) {
    const parts = lastClaim.claim_code.split('-');
    if (parts.length === 3) {
      const parsedNum = parseInt(parts[2], 10);
      if (!isNaN(parsedNum)) {
        nextSequence = parsedNum + 1;
      }
    }
  }

  const paddedNumber = String(nextSequence).padStart(4, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * POST /api/claims
 * Public endpoint to register a new claim / complaint in Libro de Reclamaciones
 */
exports.createClaim = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      doc_type,
      doc_number,
      first_name,
      last_name,
      email,
      phone,
      address,
      department,
      province,
      district,
      is_minor,
      guardian_name,
      guardian_doc_type,
      guardian_doc_number,
      contracted_good_type,
      claimed_amount,
      currency = 'PEN',
      good_description,
      claim_type,
      claim_detail,
      consumer_request,
      data_consent
    } = req.body;

    // 1. Mandatory Fields Validation (INDECOPI requirements)
    if (!doc_type || !doc_number || !first_name || !last_name || !email || !phone || !address) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Todos los datos del consumidor son obligatorios.'
      });
    }

    if (!contracted_good_type || !good_description) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Debe especificar el tipo de bien contratado (Producto o Servicio) y su descripción.'
      });
    }

    if (!claim_type || !claim_detail || !consumer_request) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Debe especificar si es Reclamo o Queja, el detalle de los hechos y su pedido concreto.'
      });
    }

    if (data_consent !== true && data_consent !== 'true') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Debe aceptar la política de tratamiento de datos personales para continuar.'
      });
    }

    // 2. Normalization & Format Checks
    const normalizedDocType = String(doc_type).toUpperCase().trim();
    const cleanDocNumber = String(doc_number).trim();

    if (normalizedDocType === 'DNI' && cleanDocNumber.length !== 8) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El DNI debe tener exactamente 8 dígitos numéricos.'
      });
    }

    if (normalizedDocType === 'RUC' && cleanDocNumber.length !== 11) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El RUC debe tener exactamente 11 dígitos numéricos.'
      });
    }

    if ((normalizedDocType === 'CE' || normalizedDocType === 'PASAPORTE') && cleanDocNumber.length < 4) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El documento de extranjería / pasaporte debe tener al menos 4 caracteres.'
      });
    }

    const normalizedGoodType = String(contracted_good_type).toUpperCase().trim();
    if (!['PRODUCTO', 'SERVICIO'].includes(normalizedGoodType)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El tipo de bien debe ser PRODUCTO o SERVICIO.'
      });
    }

    const normalizedClaimType = String(claim_type).toUpperCase().trim();
    if (!['RECLAMO', 'QUEJA'].includes(normalizedClaimType)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El tipo de reclamación debe ser RECLAMO o QUEJA.'
      });
    }

    // 3. Generate Sequential Correlative
    const claimCode = await generateClaimCode(t);

    // 4. Create Record
    const newClaim = await Claim.create({
      claim_code: claimCode,
      doc_type: String(doc_type).toUpperCase().trim(),
      doc_number: String(doc_number).trim(),
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      department: department ? String(department).trim() : null,
      province: province ? String(province).trim() : null,
      district: district ? String(district).trim() : null,
      is_minor: Boolean(is_minor),
      guardian_name: is_minor && guardian_name ? String(guardian_name).trim() : null,
      guardian_doc_type: is_minor && guardian_doc_type ? String(guardian_doc_type).trim() : null,
      guardian_doc_number: is_minor && guardian_doc_number ? String(guardian_doc_number).trim() : null,
      contracted_good_type: normalizedGoodType,
      claimed_amount: claimed_amount ? parseFloat(claimed_amount) || 0.00 : 0.00,
      currency: currency || 'PEN',
      good_description: String(good_description).trim(),
      claim_type: normalizedClaimType,
      claim_detail: String(claim_detail).trim(),
      consumer_request: String(consumer_request).trim(),
      status: 'pendiente',
      data_consent: true
    }, { transaction: t });

    await t.commit();

    // 5. Send Confirmation Email Asynchronously
    emailService.sendClaimConfirmation(newClaim).catch((err) => {
      logger.error(`[ClaimController] Failed to send email confirmation for claim ${claimCode}:`, err);
    });

    return res.status(201).json({
      success: true,
      message: 'Su hoja de reclamación ha sido registrada exitosamente.',
      claim: {
        id: newClaim.id,
        claim_code: newClaim.claim_code,
        claim_type: newClaim.claim_type,
        created_at: newClaim.created_at,
        first_name: newClaim.first_name,
        last_name: newClaim.last_name,
        doc_type: newClaim.doc_type,
        doc_number: newClaim.doc_number,
        email: newClaim.email,
        phone: newClaim.phone,
        address: newClaim.address,
        contracted_good_type: newClaim.contracted_good_type,
        claimed_amount: newClaim.claimed_amount,
        good_description: newClaim.good_description,
        claim_detail: newClaim.claim_detail,
        consumer_request: newClaim.consumer_request,
        status: newClaim.status
      }
    });
  } catch (error) {
    if (t) await t.rollback();
    logger.error('[ClaimController] Error creating claim:', error);
    next(error);
  }
};

/**
 * GET /api/claims (Admin only)
 */
exports.getAllClaims = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, claim_type, search } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = {};
    if (status) where.status = status;
    if (claim_type) where.claim_type = String(claim_type).toUpperCase();
    if (search) {
      where[Op.or] = [
        { claim_code: { [Op.iLike]: `%${search}%` } },
        { doc_number: { [Op.iLike]: `%${search}%` } },
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Claim.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['created_at', 'DESC']]
    });

    return res.json({
      success: true,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      claims: rows
    });
  } catch (error) {
    next(error);
  }
};
