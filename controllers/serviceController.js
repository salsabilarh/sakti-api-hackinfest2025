const { Service, Sector, Portofolio, SubPortofolio, SubSector, ServiceMarketingKit, Deal, Project, ServiceSectorMap } = require('../models');

module.exports = {
  getAllServices: async (req, res) => {
    try {
      const services = await Service.findAll({
        attributes: [
          'id', 
          'code', 
          'name', 
          'service_group', 
          'intro_video_url', 
          'created_at'
        ],
        include: [
          {
            model: SubPortofolio,
            as: 'sub_portofolio',
            attributes: ['id', 'code', 'name'],
            include: [{
              model: Portofolio,
              as: 'portofolio',
              attributes: ['id', 'name']
            }]
          },
          {
            model: Sector,
            as: 'sectors',
            attributes: ['id', 'code', 'name'],
            through: { attributes: [] }
          }
        ],
        order: [['created_at', 'DESC']]
      });

      const transformedServices = services.map(service => ({
        id: service.id,
        code: service.code,
        name: service.name,
        portfolio: service.sub_portofolio.portofolio.name,
        subPortfolio: service.sub_portofolio.code,
        sectors: service.sectors.map(sector => sector.code),
        serviceGroup: service.service_group,
        introVideoUrl: service.intro_video_url,
        createdAt: service.created_at
      }));

      res.json({
        status: 'success',
        data: transformedServices
      });
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  getServiceDetails: async (req, res) => {
    try {
      const service = await Service.findByPk(req.params.id, {
        attributes: [
          'id', 
          'code', 
          'name', 
          'service_group',
          'intro_video_url',
          'description_service',
          'benefit',
          'scope',
          'output',
          'regulation_ref',
          'sbu_owner',
          'created_at',
          'updated_at'
        ],
        include: [
          {
            model: SubPortofolio,
            as: 'sub_portofolio',
            attributes: ['id', 'code', 'name'],
            include: [{
              model: Portofolio,
              as: 'portofolio',
              attributes: ['id', 'name']
            }]
          },
          {
            model: Sector,
            as: 'sectors',
            attributes: ['id', 'code', 'name'],
            through: { attributes: [] },
            include: [{
              model: SubSector,
              as: 'sub_sectors',
              attributes: ['id', 'code', 'name']
            }]
          },
          {
            model: ServiceMarketingKit,
            attributes: ['id', 'file_name', 'file_type', 'file_size', 'uploaded_at']
          }
        ]
      });

      if (!service) {
        return res.status(404).json({ 
          status: 'error',
          message: 'Service not found' 
        });
      }

      const serviceDetails = {
        id: service.id,
        code: service.code,
        name: service.name,
        portfolio: {
          id: service.sub_portofolio.portofolio.id,
          name: service.sub_portofolio.portofolio.name,
        },
        subPortfolio: {
          id: service.sub_portofolio.id,
          code: service.sub_portofolio.code,
          name: service.sub_portofolio.name
        },
        sectors: service.sectors.map(sector => ({
          id: sector.id,
          code: sector.code,
          name: sector.name,
          subSectors: sector.sub_sectors.map(sub => ({
            id: sub.id,
            code: sub.code,
            name: sub.name
          }))
        })),
        serviceGroup: service.service_group,
        introVideoUrl: service.intro_video_url,
        description: service.description_service,
        benefits: service.benefit ? service.benefit.split('\n').filter(b => b.trim() !== '') : [],
        scope: service.scope ? service.scope.split('\n').filter(s => s.trim() !== '') : [],
        output: service.output ? service.output.split('\n').filter(o => o.trim() !== '') : [],
        regulationRef: service.regulation_ref,
        sbuOwner: service.sbu_owner,
        marketingKits: service.marketing_kits,
        createdAt: service.created_at,
        updatedAt: service.updated_at
      };

      res.json({
        status: 'success',
        data: serviceDetails
      });
    } catch (error) {
      console.error('Get service details error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  createService: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { 
        sub_portfolio_id, 
        name, 
        sectors, 
        intro_video_url,
        ...serviceData 
      } = req.body;

      // Validasi input
      if (!sub_portfolio_id || !name) {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'sub_portfolio_id and name are required fields'
        });
      }

      // Cek sub-portfolio
      const subPortfolio = await SubPortofolio.findByPk(sub_portfolio_id, {
        transaction,
        include: [{
          model: Portofolio,
          as: 'portofolio'
        }]
      });

      if (!subPortfolio) {
        await transaction.rollback();
        return res.status(404).json({
          status: 'error',
          message: 'Sub-portfolio not found'
        });
      }

      // Cari service terakhir dengan sub portofolio yang sama
      const lastService = await Service.findOne({
        where: {
          sub_portofolio_id: sub_portfolio_id
        },
        order: [['code', 'DESC']],
        transaction
      });

      // Generate kode baru
      let newCode;
      if (!lastService) {
        // Jika belum ada service untuk sub portofolio ini
        newCode = `${subPortfolio.code}A`;
      } else {
        // Ambil huruf terakhir dari kode
        const lastChar = lastService.code.slice(-1);
        
        // Generate huruf berikutnya (A->B, Z->AA)
        if (lastChar.match(/[A-Y]/i)) {
          const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
          newCode = `${subPortfolio.code}${nextChar}`;
        } else {
          // Jika mencapai Z, tambah huruf (Z->AA)
          const baseCode = lastService.code.slice(0, -1);
          newCode = `${baseCode}A${lastChar === 'Z' ? 'A' : ''}`;
        }
      }

      // Validasi kode unik (untuk memastikan)
      const existingService = await Service.findOne({ 
        where: { code: newCode },
        transaction
      });
      
      if (existingService) {
        await transaction.rollback();
        return res.status(409).json({
          status: 'error',
          message: 'Generated service code already exists'
        });
      }

      // Buat service dengan kode yang di-generate
      const newService = await Service.create({
        ...serviceData,
        name,
        code: newCode, // Gunakan kode yang di-generate
        intro_video_url: intro_video_url || null,
        sub_portofolio_id: sub_portfolio_id
      }, { transaction });

      // Tambahkan relasi sektor jika ada
      if (sectors && sectors.length > 0) {
        const existingSectors = await Sector.findAll({
          where: { id: sectors },
          transaction
        });

        if (existingSectors.length !== sectors.length) {
          const existingSectorIds = existingSectors.map(s => s.id);
          const missingSectors = sectors.filter(id => !existingSectorIds.includes(id));
          
          await transaction.rollback();
          return res.status(400).json({
            status: 'error',
            message: 'Some sectors not found',
            missingSectors
          });
        }

        await newService.addSectors(sectors, { transaction });
      }

      // Commit transaksi
      await transaction.commit();

      // Ambil data lengkap untuk response
      const createdService = await Service.findByPk(newService.id, {
        include: [
          {
            model: SubPortofolio,
            as: 'sub_portofolio',
            include: [{
              model: Portofolio,
              as: 'portofolio'
            }]
          },
          {
            model: Sector,
            as: 'sectors',
            through: { attributes: [] }
          }
        ]
      });

      return res.status(201).json({
        status: 'success',
        data: createdService
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating service:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  updateService: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { sectors, intro_video_url, ...updateData } = req.body;

      // Validasi URL video jika ada
      if (intro_video_url && !isValidVideoUrl(intro_video_url)) {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'Invalid video URL format'
        });
      }

      // Update data service
      const [updated] = await Service.update({
        ...updateData,
        intro_video_url: intro_video_url || null
      }, {
        where: { id },
        transaction
      });

      if (!updated) {
        await transaction.rollback();
        return res.status(404).json({ 
          status: 'error',
          message: 'Service not found' 
        });
      }

      // Update relasi sektor jika ada
      if (sectors) {
        await ServiceSectorMap.destroy({ 
          where: { service_id: id },
          transaction
        });
        
        await ServiceSectorMap.bulkCreate(
          sectors.map(sectorId => ({
            service_id: id,
            sector_id: sectorId
          })),
          { transaction }
        );
      }

      await transaction.commit();

      // Ambil data terupdate untuk response
      const updatedService = await Service.findByPk(id, {
        include: [
          {
            model: SubPortofolio,
            as: 'sub_portofolio',
            include: [{
              model: Portofolio,
              as: 'portofolio'
            }]
          },
          {
            model: Sector,
            as: 'sectors',
            through: { attributes: [] }
          }
        ]
      });

      res.json({
        status: 'success',
        message: 'Service updated successfully',
        data: {
          id: updatedService.id,
          code: updatedService.code,
          name: updatedService.name,
          introVideoUrl: updatedService.intro_video_url,
          portfolio: {
            id: updatedService.sub_portofolio.portofolio.id,
            name: updatedService.sub_portofolio.portofolio.name
          },
          subPortfolio: {
            id: updatedService.sub_portofolio.id,
            name: updatedService.sub_portofolio.name
          },
          sectors: updatedService.sectors.map(sector => ({
            id: sector.id,
            code: sector.code,
            name: sector.name
          }))
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Update service error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  deleteService: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;

      const service = await Service.findByPk(id, {
        transaction,
        include: [
          { model: Deal, attributes: ['id'] },
          { model: Project, attributes: ['id'] },
          { model: ServiceMarketingKit, attributes: ['id'] }
        ]
      });

      if (!service) {
        await transaction.rollback();
        return res.status(404).json({
          status: 'error',
          message: 'Service not found'
        });
      }

      // Validasi relasi
      if (service.deals.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete service with associated deals',
          dealCount: service.deals.length
        });
      }

      if (service.projects.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete service with associated projects',
          projectCount: service.projects.length
        });
      }

      // Hapus marketing kits
      if (service.marketing_kits.length > 0) {
        await ServiceMarketingKit.destroy({
          where: { service_id: id },
          transaction
        });
      }

      // Hapus relasi sectors
      await ServiceSectorMap.destroy({
        where: { service_id: id },
        transaction
      });

      // Hapus service
      await service.destroy({ transaction });

      await transaction.commit();

      res.json({
        status: 'success',
        message: 'Service deleted successfully',
        deletedService: {
          id: service.id,
          code: service.code,
          name: service.name
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Delete service error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Marketing Kit management
  uploadMarketingKit: async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // Verify user can manage this service
      const service = await Service.findByPk(serviceId);
      if (!canManagePortfolio(req.user, service.portfolio)) {
        return res.status(403).json({ 
          message: 'Not authorized to manage this service' 
        });
      }

      // Process file upload (implementation depends on storage solution)
      const newKit = await ServiceMarketingKit.create({
        service_id: serviceId,
        type: req.body.type,
        file_name: req.file.originalname,
        file_url: req.file.path,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        uploaded_by: req.user.id
      });

      res.status(201).json({
        message: 'Marketing kit uploaded successfully',
        kit: newKit
      });
    } catch (error) {
      console.error('Upload marketing kit error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  getMarketingKitsByService: async (req, res) => {
    try {
      const { id } = req.params;
      const kits = await ServiceMarketingKit.findAll({
        where: { service_id: id },
        order: [['uploaded_at', 'DESC']]
      });

      res.json({ message: 'Marketing kits retrieved', kits });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  deleteMarketingKit: async (req, res) => {
    try {
      const { id } = req.params;
      const kit = await ServiceMarketingKit.findByPk(id);

      if (!kit) {
        return res.status(404).json({ message: 'Marketing kit not found' });
      }

      // Optional: delete file from storage (e.g., S3, local, etc.)

      await kit.destroy();

      res.json({ message: 'Marketing kit deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Service-Sector relationship management
  // addServiceSector: async (req, res) => {
  //   try {
  //     const { serviceId, sectorId } = req.params;
      
  //     const service = await Service.findByPk(serviceId);
  //     if (!canManagePortfolio(req.user, service.portfolio)) {
  //       return res.status(403).json({ 
  //         message: 'Not authorized to manage this service' 
  //       });
  //     }

  //     const existingMap = await ServiceSectorMap.findOne({
  //       where: { service_id: serviceId, sector_id: sectorId }
  //     });

  //     if (existingMap) {
  //       return res.status(400).json({ message: 'Relationship already exists' });
  //     }

  //     const newMap = await ServiceSectorMap.create({
  //       service_id: serviceId,
  //       sector_id: sectorId
  //     });

  //     res.status(201).json({
  //       message: 'Service-Sector relationship added',
  //       map: newMap
  //     });
  //   } catch (error) {
  //     console.error('Add service-sector error:', error);
  //     res.status(500).json({ message: 'Internal server error' });
  //   }
  // }
};

// Helper function for portfolio-based access
function canManagePortfolio(user, portfolio) {
  if (user.role === 'Admin') return true;
  if (user.role === 'Staf_SBU' || user.role === 'Manajemen_SBU') {
    // Implement logic to check if user's unit matches the portfolio
    // This would require additional data model relationships
    return user.unit_kerja?.portfolio === portfolio;
  }
  return false;
}

// Helper function untuk validasi URL video
function isValidVideoUrl(url) {
  if (!url) return true;
  const videoUrlPatterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+/,
    /^(https?:\/\/)?(www\.)?example\.com\/video\/[\w-]+/
  ];
  return videoUrlPatterns.some(pattern => pattern.test(url));
}