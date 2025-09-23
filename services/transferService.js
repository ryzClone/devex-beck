// transferService.js
const { Equipment, TexHistory , Sequelize , sequelize, Position} = require('../models');
const { Op } = require("sequelize");
const path = require('path');
const fs = require('fs');

const readAcception = async (page = 1, size = 10, search = "") => {
  const offset = (page - 1) * size;

  const where = {
    status: "В рабочем состоянии", // faqat ishchi texnika
  };

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { inventory_number: { [Op.iLike]: `%${search}%` } },
      { serial_number: { [Op.iLike]: `%${search}%` } },
      { mac_address: { [Op.iLike]: `%${search}%` } },
    ];
  }

  try {
    const { rows: equipmentData, count: total } = await Equipment.findAndCountAll({
      attributes: [
        "id",
        "name",
        "inventory_number",
        "serial_number",
        "mac_address",
        "status",
        [Sequelize.fn("to_char", Sequelize.col("created_at"), "DD-MM-YYYY HH24:MI:SS"), "created_at"],
      ],
      where,
      order: [["id", "DESC"]],
      limit: size,
      offset,
    });

    const positionData = await Position.findAll();

    return {
      data: equipmentData,
      total,
      positionTable: positionData,
    };
  } catch (error) {
    console.error("❌ Error in readAcception Service:", error.message);
    throw error;
  }
};

const getTransfers = async ({ page, size, search }) => {
  try {
    // Calculating offset for pagination
    const offset = (page - 1) * size;

    // Building search filter if search term is provided
    const whereClause = search
      ? {
          [Op.or]: [
            { serial_number: { [Op.iLike]: `%${search}%` } },
            { equipment_name: { [Op.iLike]: `%${search}%` } },
            { inventory_number: { [Op.iLike]: `%${search}%` } },
            { employee: { [Op.iLike]: `%${search}%` } },
            { full_name: { [Op.iLike]: `%${search}%` } },
          ],
          [Op.not]: { id: null }, // Exclude records with null id
        }
      : {};

    // Fetching transfer records with pagination
    // const { rows: data, count: total } = await Transfered.findAndCountAll({
    //   attributes: [
    //     'id',
    //     'department',
    //     'division',
    //     'position',
    //     'serial_number',
    //     'passport_serial_number',
    //     'issued_by',
    //     'equipment_name',
    //     'inventory_number',
    //     'mac',
    //     'employee',
    //     'full_name',
    //     'document_file',
    //     'shortname',
    //     [Sequelize.fn('to_char', Sequelize.col('passport_issue_date'), 'DD-MM-YYYY'), 'passport_issue_date'],
    //     [Sequelize.fn('to_char', Sequelize.col('data'), 'DD-MM-YYYY HH24:MI:SS'), 'data']
    //   ],
    //   where: whereClause,
    //   limit: size,
    //   offset,
    // });

    // Fetching position data from the Position table
    const positionData = await Position.findAll();

    // Return the results along with the position data
    return {total, positionTable: positionData };
  } catch (error) {
    console.error("Error fetching transfer records:", error);
    throw error;
  }
};

// const addTransferedData = async (data) => {

//   const sourcePath = path.join(__dirname, '../public/files', 'output.pdf');
//   const destPath = path.join(__dirname, '../public/transfered', `${data.full_name}.pdf`);
  
//   // const transaction = await Transfered.sequelize.transaction();
//   try {
//     // Transfered jadvaliga yangi yozuv qo'shish
//     const result = await Transfered.create(data, { transaction });
//     // Texnika jadvalidagi section ustunini 'transfered' ga o'zgartirish
//     await Texnika.update(
//       { section: 'transfered' },
//       { where: { inventory_number: data.inventory_number }, transaction }
//     );

//     await fs.promises.copyFile(sourcePath, destPath);

//     // Tarixga yozish
//     await TexHistory.create({
//       data: new Date(),
//       inventory_number: data.inventory_number,
//       employee_full_name: data.full_name || "Неизвестно",
//       employee_department: data.department || "Неизвестно",
//       document_file_path: destPath,
//       username: data.employee || "",
//       status: data.status || "В рабочем состоянии",
//       equipment_name: data.equipment_name,
//       description: `Техника с инвентарным номером ${data.inventory_number} успешно передана сотруднику`,
//       action:"Передано"
//     }, { transaction });


//     await transaction.commit();
//     return result;
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Error adding new transfer record:", error);
//     throw error;
//   }
// };

const processTransferData = async (data) => {
  const t = await sequelize.transaction(); // Tranzaksiya boshlaymiz

  try {

    const sourcePath = path.join(__dirname, '../public/files', 'output.pdf'); // Kirish fayl yo'li
    const destPath = path.join(__dirname, '../public/acception', `${data.full_name}.pdf`); // Saqlash fayl yo'li

    const { id, employee, full_name, department, equipment_name, transfers } = data;

    const existingTexnika = await Texnika.findOne({
      where: { inventory_number: transfers.inventory_number },
      transaction: t, // Tranzaksiya ichida ishlaymiz
    });

    if (!existingTexnika) {
      console.warn("No matching record found in Texnika table");
      throw new Error("No matching data found in Texnika table");
    }

    await existingTexnika.update(
      { section: "acception" },
      { transaction: t }
    );


    const history = await TexHistory.create(
      {
        data: new Date(),
        inventory_number: transfers.inventory_number,
        employee_full_name: full_name,
        employee_department: department,
        document_file_path: destPath,
        username: employee,
        status: "В рабочем состоянии",
        equipment_name: transfers.equipment_name,
        description: `Техника с инвентарным номером ${data.inventory_number} успешно возвращена от сотрудника`,
        action:"Принято"
      },
      { transaction: t }
    );

    await fs.promises.copyFile(sourcePath, destPath); 

    console.log("New record added to TexHistory table:", history);

    // **4. Transfered jadvalidan yozuvni o‘chirish**
    // const deleted = await Transfered.destroy({
    //   where: {
    //     id: id,
    //     inventory_number: transfers.inventory_number,
    //     equipment_name: equipment_name,
    //   },
    //   transaction: t,
    // });


    if (!deleted) {
      console.warn("No matching record found in Transfered table");
      throw new Error("No matching data found in Transfered table");
    }


    // **Barcha operatsiyalar muvaffaqiyatli bo‘lsa, tranzaksiyani commit qilish**
    await t.commit();

    return existingTexnika;
  } catch (error) {
    console.error("Error processing transfer data:", error);
    await t.rollback(); // Xatolik bo‘lsa, tranzaksiyani bekor qilish
    throw error;
  }
};

module.exports = { readAcception , getTransfers, processTransferData };
// addTransferedData