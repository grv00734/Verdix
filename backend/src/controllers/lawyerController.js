const Lawyer = require('../models/Lawyer');
const User = require('../models/User');

// Register/Create lawyer profile
const registerLawyer = async (req, res) => {
  try {
    const {
      licenseNumber,
      specializations,
      experience,
      barCouncil,
      consultationFee,
      hourlyRate,
      bio,
      languages,
      office
    } = req.body;
    
    // Check if lawyer profile already exists
    const existingLawyer = await Lawyer.findOne({ userId: req.user.id });
    if (existingLawyer) {
      return res.status(400).json({ error: 'Lawyer profile already exists' });
    }
    
    const lawyer = new Lawyer({
      userId: req.user.id,
      licenseNumber,
      specializations,
      experience,
      barCouncil,
      consultationFee,
      hourlyRate,
      bio,
      languages,
      office
    });
    
    await lawyer.save();
    
    res.status(201).json({
      message: 'Lawyer profile created successfully',
      lawyer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update lawyer profile
const updateLawyerProfile = async (req, res) => {
  try {
    const lawyer = await Lawyer.findOneAndUpdate(
      { userId: req.user.id },
      req.body,
      { new: true }
    );
    
    if (!lawyer) {
      return res.status(404).json({ error: 'Lawyer profile not found' });
    }
    
    res.status(200).json({
      message: 'Profile updated successfully',
      lawyer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get lawyer profile
const getLawyerProfile = async (req, res) => {
  try {
    const { lawyerId } = req.params;
    const lawyer = await Lawyer.findById(lawyerId);
    
    if (!lawyer) {
      return res.status(404).json({ error: 'Lawyer not found' });
    }
    
    const user = await User.findById(lawyer.userId);
    
    res.status(200).json({
      ...lawyer.toObject(),
      email: user.email,
      phone: user.phone,
      name: user.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search lawyers
const searchLawyers = async (req, res) => {
  try {
    const { specialization, city, rating, minExperience } = req.query;
    
    const query = { verificationStatus: 'verified' };
    
    if (specialization) {
      query.specializations = specialization;
    }
    if (city) {
      query['office.city'] = city;
    }
    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }
    if (minExperience) {
      query.experience = { $gte: parseInt(minExperience) };
    }
    
    const lawyers = await Lawyer.find(query).sort({ rating: -1 });
    
    // Populate user details
    const results = await Promise.all(
      lawyers.map(async (lawyer) => {
        const user = await User.findById(lawyer.userId);
        return {
          id: lawyer._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          ...lawyer.toObject()
        };
      })
    );
    
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all lawyers (for admin)
const getAllLawyers = async (req, res) => {
  try {
    const lawyers = await Lawyer.find();
    res.status(200).json(lawyers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify lawyer (admin function)
const verifyLawyer = async (req, res) => {
  try {
    const { lawyerId } = req.params;
    const { status } = req.body;
    
    const lawyer = await Lawyer.findByIdAndUpdate(
      lawyerId,
      { verificationStatus: status },
      { new: true }
    );
    
    res.status(200).json({
      message: `Lawyer ${status} successfully`,
      lawyer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerLawyer,
  updateLawyerProfile,
  getLawyerProfile,
  searchLawyers,
  getAllLawyers,
  verifyLawyer
};
