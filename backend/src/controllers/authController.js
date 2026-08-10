const jwt = require('jsonwebtoken');
const { User, Address } = require('../models');
const emailService = require('../services/emailService');

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

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'La contraseña actual y la nueva contraseña son requeridas.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'La confirmación de la contraseña no coincide.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user || !user.is_active) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const isValid = await user.validPassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta.' });
    }

    user.password_hash = newPassword;
    await user.save();

    // Security alert email via Resend
    await emailService.sendEmail({
      to: user.email,
      subject: 'Notificación de Cambio de Contraseña - SUPER Tech Store',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
          <div style="background-color: #0F172A; color: white; padding: 15px; text-align: center; border-radius: 6px;">
            <h2 style="color: #EF4444; margin: 0;">SUPER TECH STORE</h2>
          </div>
          <div style="padding: 20px 0;">
            <h3 style="color: #1F2937;">Cambio de Contraseña Confirmado</h3>
            <p style="color: #4B5563;">Te informamos que la contraseña de tu cuenta ha sido modificada correctamente desde tu perfil de usuario.</p>
            <p style="font-size: 12px; color: #9CA3AF;">Si no realizaste este cambio, por favor ponte en contacto con soporte inmediatamente.</p>
          </div>
        </div>
      `
    });

    return res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente.'
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await User.findOne({ where: { email } });
      if (user && user.is_active) {
        const resetToken = jwt.sign(
          { id: user.id, email: user.email, type: 'reset_password' },
          process.env.JWT_SECRET || 'super_secret_jwt_key_tech_ecommerce_2026_change_in_prod',
          { expiresIn: '1h' }
        );
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

        await emailService.sendPasswordReset(user.email, resetUrl);
      }
    }

    // Generic response for security to avoid exposing registered emails
    return res.json({
      success: true,
      message: 'Si el correo electrónico está registrado, recibirás un enlace con instrucciones para restablecer tu contraseña.'
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'El token y la nueva contraseña son requeridos.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_tech_ecommerce_2026_change_in_prod');
    } catch (err) {
      return res.status(400).json({ success: false, message: 'El enlace de recuperación es inválido o ha expirado.' });
    }

    if (decoded.type !== 'reset_password') {
      return res.status(400).json({ success: false, message: 'Token de recuperación no válido.' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado o deshabilitado.' });
    }

    user.password_hash = password;
    await user.save();

    await emailService.sendEmail({
      to: user.email,
      subject: 'Contraseña Restablecida Con Éxito - SUPER Tech Store',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
          <h2 style="color: #DC2626;">SUPER TECH STORE</h2>
          <h3>Tu contraseña ha sido restablecida</h3>
          <p>Te confirmamos que la contraseña de tu cuenta ha sido actualizada exitosamente.</p>
          <p style="font-size: 12px; color: #6b7280;">Si no solicitaste este cambio, por favor contáctanos de inmediato.</p>
        </div>
      `
    });

    return res.json({
      success: true,
      message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.'
    });
  } catch (error) {
    next(error);
  }
};
