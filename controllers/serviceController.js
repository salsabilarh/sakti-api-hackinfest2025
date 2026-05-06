/**
 * controllers/serviceController.js
 *
 * Mengelola operasi CRUD untuk data Layanan (Service) beserta relasi:
 * - Portfolio, Sub Portfolio, Unit SBU, Sektor, Sub Sektor
 * - Marketing Kit (many-to-many melalui pivot)
 * - Data Revenue (pendapatan dari pelanggan)
 *
 * ============================================================
 * DAFTAR PERBAIKAN DALAM FILE INI
 * ============================================================
 * [Fix #9  — Medium]   Duplicate JOIN saat filter + sort menggunakan model yang sama.
 *   → Pisahkan filterInclude (WHERE) dari displayInclude (SELECT).
 *
 * [Fix #10 — Medium]   createService() tidak memvalidasi field wajib.
 *   → Tambahkan validasi name dan keberadaan portfolio/sub_portfolio di DB.
 *
 * [Fix #11 — Low]      Error object mentah dikembalikan ke client.
 *   → Kembalikan pesan generik; detail hanya di NODE_ENV=development.
 *
 * [Fix #12 — Low]      revenue tidak divalidasi sebagai angka positif.
 *   → Konversi ke Number() dan validasi >= 0.
 *
 * [Fix N27 — Critical] updateService() mengirim undefined ke update() yang dapat mengosongkan field.
 *   → Gunakan !== undefined check dan fallback ke nilai existing.
 *
 * [Fix N31 — Medium]   `if (sectors)` mengevaluasi array kosong sebagai falsy.
 *   → Ganti dengan `if (sectors !== undefined)` agar bisa hapus semua relasi.
 *
 * [Fix N34 — Medium]   createService() tidak memvalidasi portfolio_id dan sub_portfolio_id di DB.
 *   → Tambahkan findByPk check sebelum create.
 *
 * [Fix N37 — Low]      Parameter order tidak dinormalisasi uppercase.
 *   → Normalisasi ke 'ASC' atau 'DESC'.
 *
 * [Fix N38 — Low]      name tidak di-trim sebelum duplicate check.
 *   → Tambahkan .trim() sebelum findOne dan create.
 *
 * [Fix N41 — Low]      Import xlsx tidak digunakan → dihapus.
 * [Fix N42 — Low]      Import Sequelize (class) tidak digunakan → dihapus.
 * [Fix N46 — Low]      getServiceById() memutasi Sequelize instance in-place.
 *   → Gunakan toJSON() + spread sebelum sort.
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
 * MAX_PAGINATION_LIMIT — Batas maksimum item per halaman (mencegah data dump).
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
const MAX_PAGINATION_LIMIT = 100;

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
 * Endpoint ini dioptimalkan untuk performa dengan memisahkan filterInclude
 * dan displayInclude untuk menghindari duplicate JOIN.
 *
 * @query {string} [search] - Kata kunci pencarian (nama atau kode layanan)
 * @query {string} [portfolio] - Filter berdasarkan ID portfolio
 * @query {string} [sector] - Filter berdasarkan ID sektor
 * @query {string} [sort=name] - Kolom sorting (name|portfolio|sector)
 * @query {string} [order=asc] - Arah sorting (asc|desc)
 * @query {number} [page=1] - Halaman
 * @query {number} [limit=10] - Item per halaman (maks 100)
 */
exports.getAllServices = async (req, res) => {
  try {
    const {
      search,
      portfolio,
      sector,
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

    // Normalisasi arah sorting (Sequelize membutuhkan 'ASC'/'DESC')
    const safeOrder = (order || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Pagination dengan batas maksimum
    const { limit, page, offset } = parsePagination(req.query);

    // WHERE clause untuk pencarian teks
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }

    /**
     * [Fix #9] filterInclude — HANYA untuk WHERE clause (tidak mengambil data).
     * Digunakan di Service.count() untuk menghitung total.
     */
    const filterInclude = [];
    if (portfolio) {
      filterInclude.push({
        model: Portfolio,
        as: 'portfolio',
        where: { id: portfolio },
        attributes: [],
      });
    }
    if (sector) {
      filterInclude.push({
        model: Sector,
        as: 'sectors',
        where: { id: sector },
        attributes: [],
        through: { attributes: [] },
      });
    }

    // Hitung total dengan filterInclude agar angka akurat
    const total = await Service.count({
      where,
      include: filterInclude,
      distinct: true,
    });

    // Bangun order clause berdasarkan field yang dipilih
    let orderClause;
    if (sort === 'portfolio') {
      orderClause = [[{ model: Portfolio, as: 'portfolio' }, 'name', safeOrder]];
    } else if (sort === 'sector') {
      orderClause = [[{ model: Sector, as: 'sectors' }, 'code', safeOrder]];
    } else {
      orderClause = [[sort, safeOrder]];
    }

    /**
     * displayInclude — untuk SELECT data ke client (tanpa WHERE agar tidak bentrok).
     */
    const displayInclude = [
      { model: Portfolio, as: 'portfolio', attributes: ['id', 'name'] },
      { model: SubPortfolio, as: 'sub_portfolio', attributes: ['code'] },
      {
        model: Sector,
        as: 'sectors',
        attributes: ['id', 'code'],
        through: { attributes: [] },
      },
    ];

    const services = await Service.findAll({
      where,
      include: displayInclude,
      attributes: ['id', 'name', 'code', 'portfolio_id'],
      order: orderClause,
      limit,
      offset,
      subQuery: false, // diperlukan untuk ORDER BY relasi + LIMIT
    });

    // Filter post-query untuk portfolio dan sector (lebih predictable)
    let result = services;
    if (portfolio) {
      result = result.filter(
        (s) => s.portfolio && String(s.portfolio.id || s.portfolio_id) === String(portfolio)
      );
    }
    if (sector) {
      result = result.filter(
        (s) => s.sectors && s.sectors.some((sec) => String(sec.id) === String(sector))
      );
    }

    // Format response ringkas untuk frontend
    const formatted = result.map((s) => ({
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
        total,
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
 * [Fix N46] Tidak memutasi instance Sequelize secara in-place.
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

    // [Fix N46] Konversi ke plain object, lalu sort copy revenue
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
 * [Fix #10] Validasi field wajib (name).
 * [Fix N34] Validasi keberadaan portfolio_id dan sub_portfolio_id di DB.
 * [Fix N38] Trim name sebelum duplicate check.
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

    // ========== Validasi dasar ==========
    if (!name || !name.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        pesan: 'Nama layanan wajib diisi',
      });
    }

    const trimmedName = name.trim();

    // Cek duplikasi nama
    const existingService = await Service.findOne({ where: { name: trimmedName } });
    if (existingService) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        pesan: 'Nama layanan sudah digunakan',
      });
    }

    // ========== Validasi foreign keys ==========
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
      // Pastikan sub_portfolio milik portfolio yang benar
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

    // ========== Validasi sektor & sub sektor ==========
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

    // ========== Create service ==========
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

    // ========== Tambah relasi many-to-many ==========
    if (Array.isArray(sectors) && sectors.length > 0) {
      await service.addSectors(sectors, { transaction });
    }
    if (Array.isArray(sub_sectors) && sub_sectors.length > 0) {
      await service.addSub_sectors(sub_sectors, { transaction });
    }

    await transaction.commit();

    // Ambil data lengkap untuk response (tanpa transaksi)
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
 * [Fix N27 — Critical] Partial update aman: periksa `!== undefined` untuk setiap field.
 * [Fix N31 — Medium]   Mendukung penghapusan semua relasi dengan mengirim sectors=[].
 * [Fix N38]            Trim name sebelum validasi duplikasi.
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

    /**
     * [Fix N27] Safe partial update: hanya field yang dikirim yang diubah.
     * Jika tidak dikirim (undefined), gunakan nilai existing.
     */
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

    /**
     * [Fix N31] Update relasi dengan `!== undefined` agar array kosong [] tetap diproses.
     */
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
 * Relasi di tabel pivot (service_sectors, service_sub_sectors, marketing_kit_services)
 * akan ikut terhapus karena CASCADE DELETE di migrasi.
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
 * [Fix #12] Memvalidasi revenue sebagai angka positif.
 */
exports.addServiceRevenue = async (req, res) => {
  try {
    const { id: service_id } = req.params;
    const { customer_name, revenue, unit_id } = req.body;

    // Validasi field wajib
    if (!customer_name || revenue === undefined || revenue === null || !unit_id) {
      return res.status(400).json({
        success: false,
        pesan: 'Nama pelanggan, nilai revenue, dan unit wajib diisi',
      });
    }

    // [Fix #12] Validasi revenue sebagai angka positif
    const revenueValidation = validateRevenue(revenue);
    if (!revenueValidation.valid) {
      return res.status(400).json({
        success: false,
        pesan: revenueValidation.message,
      });
    }

    // Pastikan service dan unit ada di DB
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