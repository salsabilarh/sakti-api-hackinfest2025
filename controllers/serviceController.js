/**
 * controllers/serviceController.js
 *
 * Mengelola operasi CRUD untuk data Layanan (Service) beserta relasi:
 * - Portfolio, Sub Portfolio, Unit SBU, Sektor, Sub Sektor
 * - Marketing Kit (many-to-many melalui pivot)
 * - Data Revenue (pendapatan dari pelanggan)
 *
 * ============================================================
 * PANDUAN MAINTENANCE
 * ============================================================
 * buildFullInclude() — Helper untuk include relasi lengkap.
 *   Modifikasi di sini berlaku untuk getServiceById, createService (response),
 *   dan updateService (response).
 *
 * parsePagination() — Digunakan di getAllServices untuk limit & offset.
 *
 * ALLOWED_SORT_FIELDS — Whitelist kolom yang aman untuk sorting.
 *
 * MAX_PAGINATION_LIMIT — Batas maksimum item per halaman (mencegah data dump) = 20.
 */

// ============================================================
// Dependencies
// ============================================================
const {
  Service,
  Portfolio,
  SubPortfolio,
  Unit,
  Sector,
  SubSector,
  MarketingKit,
  ServiceRevenue,
} = require('../models');
const { Op } = require('sequelize');

// ============================================================
// Constants
// ============================================================

/** Whitelist kolom yang diizinkan untuk sorting (mencegah SQL injection) */
const ALLOWED_SORT_FIELDS = ['name', 'portfolio', 'sector'];

/** Batas maksimum item per halaman (mencegah data dump) */
const MAX_PAGINATION_LIMIT = 20;

// ============================================================
// Helper Functions (Private)
// ============================================================

/**
 * Mem-parsing dan memvalidasi parameter pagination dari query string.
 * Menerapkan batas maksimum untuk mencegah request yang mengambil seluruh data.
 *
 * @param {Object} query - req.query dari Express
 * @returns {{ limit: number, page: number, offset: number }}
 */
function parsePagination(query) {
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || 10, 1),
    MAX_PAGINATION_LIMIT
  );
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}

/**
 * Membangun array include untuk detail lengkap layanan.
 * Digunakan di getServiceById, createService (response), updateService (response).
 *
 * @returns {Array} Sequelize include array
 */
function buildFullInclude() {
  return [
    { model: Portfolio, as: 'portfolio', attributes: ['id', 'name'] },
    { model: SubPortfolio, as: 'sub_portfolio', attributes: ['id', 'name', 'code'] },
    { model: Unit, as: 'sbu_owner', attributes: ['id', 'name'] },
    {
      model: Sector,
      as: 'sectors',
      attributes: ['id', 'name', 'code'],
      through: { attributes: [] },
    },
    {
      model: SubSector,
      as: 'sub_sectors',
      attributes: ['id', 'name', 'code'],
      through: { attributes: [] },
    },
    {
      model: MarketingKit,
      as: 'marketing_kits',
      attributes: ['id', 'name', 'file_type', 'created_at'],
      through: { attributes: [] },
    },
    {
      model: ServiceRevenue,
      as: 'revenues',
      attributes: ['id', 'customer_name', 'revenue'],
      include: [{ model: Unit, as: 'unit', attributes: ['id', 'name'] }],
    },
  ];
}

/**
 * Memvalidasi dan mengkonversi revenue menjadi angka positif.
 *
 * @param {any} value - Nilai revenue dari request body
 * @returns {{ valid: boolean, value: number, message: string }}
 */
function validateRevenue(value) {
  const revenueNum = Number(value);
  if (isNaN(revenueNum) || revenueNum < 0) {
    return {
      valid: false,
      value: 0,
      message: 'Nilai revenue harus berupa angka yang valid dan tidak boleh negatif',
    };
  }
  return { valid: true, value: revenueNum, message: '' };
}

// ============================================================
// Controllers
// ============================================================

/**
 * GET /api/services
 *
 * Mendapatkan daftar layanan dengan dukungan filter, sorting, dan pagination.
 * Menggunakan two-step query untuk menghindari duplicate JOIN:
 *   1. Hitung total + ambil ID layanan hasil filter (dengan pagination & sorting)
 *   2. Ambil data lengkap berdasarkan ID yang sudah di-filter
 *
 * @query {string} [search] - Kata kunci pencarian (nama atau kode layanan)
 * @query {string} [portfolio] - Filter berdasarkan ID portfolio
 * @query {string} [sector] - Filter berdasarkan ID sektor
 * @query {string} [sort=name] - Kolom sorting (name|portfolio|sector)
 * @query {string} [order=asc] - Arah sorting (asc|desc)
 * @query {number} [page=1] - Halaman
 * @query {number} [limit=10] - Item per halaman (maks 20)
 */
exports.getAllServices = async (req, res) => {
  try {
    const {
      search,
      portfolio_id,
      sector_id,
      sort = 'name',
      order = 'asc',
    } = req.query;

    // Validasi kolom sorting (whitelist)
    if (!ALLOWED_SORT_FIELDS.includes(sort)) {
      return res.status(400).json({
        success: false,
        pesan: `Kolom pengurutan tidak valid. Pilihan: ${ALLOWED_SORT_FIELDS.join(', ')}`,
      });
    }

    const safeOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const { limit, page, offset } = parsePagination(req.query);

    // Where clause untuk pencarian teks
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }

    // Include untuk filter (portfolio dan sektor) – hanya untuk keperluan WHERE
    const filterIncludes = [];
    if (portfolio_id) {
      filterIncludes.push({
        model: Portfolio,
        as: 'portfolio',
        where: { id: portfolio_id },
        required: true,
        attributes: [],
      });
    }
    if (sector_id) {
      filterIncludes.push({
        model: Sector,
        as: 'sectors',
        where: { id: sector_id },
        required: true,
        attributes: [],
        through: { attributes: [] },
      });
    }

    // Include khusus untuk sorting (hanya jika kolom sorting butuh join)
    const orderIncludes = [];
    if (sort === 'portfolio') {
      // Hanya tambah jika belum ada di filter
      if (!portfolio_id) {
        orderIncludes.push({
          model: Portfolio,
          as: 'portfolio',
          required: false,
          attributes: [],
        });
      }
    } else if (sort === 'sector') {
      // Hanya tambah jika belum ada di filter
      if (!sector_id) {
        orderIncludes.push({
          model: Sector,
          as: 'sectors',
          required: false,
          attributes: [],
          through: { attributes: [] },
        });
      }
    }

    // Gabungkan include tanpa duplikasi
    const allIncludes = [...filterIncludes];
    orderIncludes.forEach(oi => {
      const exists = allIncludes.some(
        inc => inc.model === oi.model && inc.as === oi.as
      );
      if (!exists) {
        allIncludes.push(oi);
      }
    });
    
    // Step 1: Hitung total layanan setelah filter
    const totalCount = await Service.count({
      where,
      include: filterIncludes,
      distinct: true,
    });

    // Step 2: Ambil hanya ID layanan yang sudah di-filter, dengan pagination & sorting
    const idRows = await Service.findAll({
      where,
      include: allIncludes,
      attributes: ['id'],
      group: ['Service.id'],
      order: (() => {
        if (sort === 'portfolio') {
          return [[{ model: Portfolio, as: 'portfolio' }, 'name', safeOrder]];
        } else if (sort === 'sector') {
          return [[{ model: Sector, as: 'sectors' }, 'code', safeOrder]];
        }
        return [[sort, safeOrder]];
      })(),
      offset,
      limit,
      subQuery: false,
    });

    const serviceIds = idRows.map(row => row.id);
    if (serviceIds.length === 0) {
      return res.json({
        success: true,
        data: {
          total: totalCount,
          halaman: page,
          limit,
          layanan: [],
        },
      });
    }

    // Step 3: Ambil data lengkap tanpa sorting (hanya berdasarkan ID)
    const services = await Service.findAll({
      where: { id: serviceIds },
      include: [
        { model: Portfolio, as: 'portfolio', attributes: ['name'] },
        { model: SubPortfolio, as: 'sub_portfolio', attributes: ['code'] },
        {
          model: Sector,
          as: 'sectors',
          attributes: ['code'],
          through: { attributes: [] },
        },
      ],
    });

    // Step 4: Urutkan manual sesuai urutan serviceIds (mempertahankan urutan pagination)
    const sortedServices = serviceIds
      .map(id => services.find(s => s.id === id))
      .filter(Boolean);

    const formatted = sortedServices.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      portfolio: s.portfolio?.name || null,
      sub_portfolio: s.sub_portfolio?.code || null,
      sectors: (s.sectors || []).map((sec) => sec.code),
    }));

    return res.json({
      success: true,
      data: {
        total: totalCount,
        halaman: page,
        limit,
        layanan: formatted,
      },
    });
  } catch (error) {
    console.error('[getAllServices] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil daftar layanan',
    });
  }
};

/**
 * GET /api/services/:id
 *
 * Mendapatkan detail lengkap satu layanan termasuk semua relasi.
 * Revenue diurutkan dari nilai tertinggi ke terendah.
 *
 * Tidak memutasi instance Sequelize secara in-place.
 */
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id, {
      include: buildFullInclude(),
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        pesan: 'Layanan tidak ditemukan',
      });
    }

    // Konversi ke plain object lalu sort copy revenue (hindari mutasi)
    const serviceData = service.toJSON();
    if (Array.isArray(serviceData.revenues)) {
      serviceData.revenues = [...serviceData.revenues].sort(
        (a, b) => parseFloat(b.revenue) - parseFloat(a.revenue)
      );
    }

    return res.json({ success: true, data: serviceData });
  } catch (error) {
    console.error('[getServiceById] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal mengambil detail layanan',
    });
  }
};

/**
 * POST /api/services
 *
 * Membuat layanan baru dengan relasi sektor dan sub sektor.
 * Semua operasi dibungkus dalam database transaction.
 *
 * Validasi field wajib (name).
 * Validasi keberadaan portfolio_id dan sub_portfolio_id di DB.
 * Trim name sebelum duplicate check.
 */
exports.createService = async (req, res) => {
  const transaction = await Service.sequelize.transaction();

  try {
    const {
      name,
      group,
      intro_video_url,
      overview,
      scope,
      benefit,
      output,
      regulation_ref,
      portfolio_id,
      sub_portfolio_id,
      sbu_owner_id,
      sectors,
      sub_sectors,
    } = req.body;

    // --- Validasi dasar ---
    if (!name || !name.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        pesan: 'Nama layanan wajib diisi',
      });
    }

    const trimmedName = name.trim();

    const existingService = await Service.findOne({ where: { name: trimmedName } });
    if (existingService) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        pesan: 'Nama layanan sudah digunakan',
      });
    }

    // --- Validasi foreign keys ---
    if (portfolio_id) {
      const portfolioExists = await Portfolio.findByPk(portfolio_id);
      if (!portfolioExists) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: 'Portfolio tidak ditemukan',
        });
      }
    }

    if (sub_portfolio_id) {
      const subPortfolioExists = await SubPortfolio.findByPk(sub_portfolio_id);
      if (!subPortfolioExists) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: 'Sub portfolio tidak ditemukan',
        });
      }
      if (portfolio_id && subPortfolioExists.portfolio_id !== portfolio_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: 'Sub portfolio tidak termasuk dalam portfolio yang dipilih',
        });
      }
    }

    if (sbu_owner_id) {
      const unitExists = await Unit.findByPk(sbu_owner_id);
      if (!unitExists) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: 'Unit SBU pemilik tidak ditemukan',
        });
      }
    }

    // --- Validasi sektor & sub sektor (opsional) ---
    if (Array.isArray(sectors) && sectors.length > 0) {
      const uniqueSectorIds = [...new Set(sectors)];
      const foundSectors = await Sector.findAll({
        where: { id: uniqueSectorIds },
        attributes: ['id'],
      });
      const foundIds = foundSectors.map(s => s.id);
      const missing = uniqueSectorIds.filter(id => !foundIds.includes(id));
      if (missing.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: `Sektor dengan ID berikut tidak ditemukan: ${missing.join(', ')}`,
        });
      }
    }

    if (Array.isArray(sub_sectors) && sub_sectors.length > 0) {
      const uniqueSubIds = [...new Set(sub_sectors)];
      const foundSubs = await SubSector.findAll({
        where: { id: uniqueSubIds },
        attributes: ['id'],
      });
      const foundIds = foundSubs.map(ss => ss.id);
      const missing = uniqueSubIds.filter(id => !foundIds.includes(id));
      if (missing.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          pesan: `Sub sektor dengan ID berikut tidak ditemukan: ${missing.join(', ')}`,
        });
      }
    }

    // --- Create service dalam transaksi ---
    const service = await Service.create(
      {
        name: trimmedName,
        group,
        intro_video_url,
        overview,
        scope,
        benefit,
        output,
        regulation_ref,
        portfolio_id,
        sub_portfolio_id,
        sbu_owner_id,
        created_by: req.user.id,
      },
      { transaction }
    );

    // --- Tambahkan relasi many-to-many ---
    if (Array.isArray(sectors) && sectors.length > 0) {
      await service.addSectors(sectors, { transaction });
    }
    if (Array.isArray(sub_sectors) && sub_sectors.length > 0) {
      await service.addSub_sectors(sub_sectors, { transaction });
    }

    await transaction.commit();

    const createdService = await Service.findByPk(service.id, {
      include: buildFullInclude(),
    });

    return res.status(201).json({
      success: true,
      data: createdService,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[createService] Error:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        pesan: 'Nama atau kode layanan sudah digunakan. Silakan coba lagi.',
      });
    }

    return res.status(500).json({
      success: false,
      pesan: 'Gagal membuat layanan',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * PUT /api/services/:id
 *
 * Memperbarui data layanan secara parsial (hanya field yang dikirim yang diubah).
 *
 * Partial update aman: periksa `!== undefined` untuk setiap field.
 * Mendukung penghapusan semua relasi dengan mengirim sectors=[].
 * Trim name sebelum validasi duplikasi.
 */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      group,
      intro_video_url,
      overview,
      scope,
      benefit,
      output,
      regulation_ref,
      sbu_owner_id,
      sectors,
      sub_sectors,
    } = req.body;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        pesan: 'Layanan tidak ditemukan',
      });
    }

    // Validasi nama jika dikirim
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          pesan: 'Nama layanan tidak boleh kosong',
        });
      }
      if (trimmedName !== service.name) {
        const duplicate = await Service.findOne({ where: { name: trimmedName } });
        if (duplicate && String(duplicate.id) !== String(id)) {
          return res.status(409).json({
            success: false,
            pesan: 'Nama layanan sudah digunakan oleh layanan lain',
          });
        }
      }
    }

    // Safe partial update: hanya field yang dikirim yang diubah
    await service.update({
      name: name !== undefined ? name.trim() : service.name,
      group: group !== undefined ? group : service.group,
      intro_video_url: intro_video_url !== undefined ? intro_video_url : service.intro_video_url,
      overview: overview !== undefined ? overview : service.overview,
      scope: scope !== undefined ? scope : service.scope,
      benefit: benefit !== undefined ? benefit : service.benefit,
      output: output !== undefined ? output : service.output,
      regulation_ref: regulation_ref !== undefined ? regulation_ref : service.regulation_ref,
      sbu_owner_id: sbu_owner_id !== undefined ? sbu_owner_id : service.sbu_owner_id,
    });

    // Update relasi many-to-many (mendukung array kosong untuk hapus semua)
    if (sectors !== undefined) {
      await service.setSectors(sectors);
    }
    if (sub_sectors !== undefined) {
      await service.setSub_sectors(sub_sectors);
    }

    const updatedService = await Service.findByPk(id, {
      include: buildFullInclude(),
    });

    return res.json({
      success: true,
      pesan: 'Layanan berhasil diperbarui',
      data: updatedService,
    });
  } catch (error) {
    console.error('[updateService] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal memperbarui layanan',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
};

/**
 * DELETE /api/services/:id
 *
 * Menghapus layanan secara permanen (hard delete).
 * Relasi di tabel pivot akan ikut terhapus karena CASCADE DELETE di migrasi.
 */
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        pesan: 'Layanan tidak ditemukan',
      });
    }

    const namaLayanan = service.name;
    await service.destroy();

    return res.json({
      success: true,
      pesan: `Layanan "${namaLayanan}" berhasil dihapus`,
    });
  } catch (error) {
    console.error('[deleteService] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal menghapus layanan',
    });
  }
};

/**
 * POST /api/services/:id/revenue
 *
 * Menambahkan data revenue (pendapatan) untuk suatu layanan.
 * Digunakan oleh manajemen untuk mencatat nilai kontrak dengan pelanggan.
 *
 * Memvalidasi revenue sebagai angka positif.
 */
exports.addServiceRevenue = async (req, res) => {
  try {
    const { id: service_id } = req.params;
    const { customer_name, revenue, unit_id } = req.body;

    if (!customer_name || revenue === undefined || revenue === null || !unit_id) {
      return res.status(400).json({
        success: false,
        pesan: 'Nama pelanggan, nilai revenue, dan unit wajib diisi',
      });
    }

    const revenueValidation = validateRevenue(revenue);
    if (!revenueValidation.valid) {
      return res.status(400).json({
        success: false,
        pesan: revenueValidation.message,
      });
    }

    const [service, unit] = await Promise.all([
      Service.findByPk(service_id),
      Unit.findByPk(unit_id),
    ]);

    if (!service) {
      return res.status(404).json({
        success: false,
        pesan: 'Layanan tidak ditemukan',
      });
    }
    if (!unit) {
      return res.status(404).json({
        success: false,
        pesan: 'Unit tidak ditemukan',
      });
    }

    const newRevenue = await ServiceRevenue.create({
      service_id,
      customer_name: customer_name.trim(),
      revenue: revenueValidation.value,
      unit_id,
    });

    return res.status(201).json({
      success: true,
      pesan: 'Data revenue berhasil ditambahkan',
      data: newRevenue,
    });
  } catch (error) {
    console.error('[addServiceRevenue] Error:', error);
    return res.status(500).json({
      success: false,
      pesan: 'Gagal menambahkan data revenue',
    });
  }
};