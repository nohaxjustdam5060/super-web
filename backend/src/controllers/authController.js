const jwt = require('jsonwebtoken');
const { User, Address } = require('../models');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_tech_ecommerce_2026_change_in_prod',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET || 'super_secret_refresh_key_tech_ecommerce_2026',
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }

    const user = await User.create({
      name,
      email,
      password_hash: password,
      phone,
      role: 'cliente'
    });

    const tokens = generateTokens(user);
    user.refresh_token = tokens.refreshToken;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: user.toJSON(),
      ...tokens
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas o cuenta deshabilitada.' });
    }

    const isValid = await user.validPassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    const tokens = generateTokens(user);
    user.refresh_token = tokens.refreshToken;
    await user.save();

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: user.toJSON(),
      ...tokens
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token requerido' });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'super_secret_refresh_key_tech_ecommerce_2026');
    const user = await User.findByPk(decoded.id);

    if (!user || user.refresh_token !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token inválido' });
    }

    const tokens = generateTokens(user);
    user.refresh_token = tokens.refreshToken;
    await user.save();

    return res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token expirado o inválido' });
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Address, as: 'addresses' }]
    });

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const { title, recipient_name, phone, address_line1, address_line2, city, state, postal_code, is_default } = req.body;

    if (is_default) {
      await Address.update({ is_default: false }, { where: { user_id: req.user.id } });
    }

    const address = await Address.create({
      user_id: req.user.id,
      title,
      recipient_name,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      is_default: !!is_default
    });

    return res.status(201).json({
      success: true,
      message: 'Dirección agregada correctamente',
      address
    });
  } catch (error) {
    next(error);
  }
};
