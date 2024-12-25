"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var path = require('path');
var dotenv = require('dotenv');
var Airtable = require('airtable');
// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error('Missing required environment variables: AIRTABLE_API_KEY and/or AIRTABLE_BASE_ID');
}
var airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
var prisma = new client_1.PrismaClient();
function fetchAirtableRecords(tableName) {
    return __awaiter(this, void 0, void 0, function () {
        var records_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    records_1 = [];
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            airtableBase(tableName)
                                .select()
                                .eachPage(function page(pageRecords, fetchNextPage) {
                                records_1.push.apply(records_1, pageRecords);
                                fetchNextPage();
                            }, function done(err) {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(records_1);
                            });
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, records_1];
                case 2:
                    error_1 = _a.sent();
                    console.error("Error fetching records from Airtable table ".concat(tableName, ":"), error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function mapAirtableThemeToEnum(airtableTheme) {
    if (!airtableTheme)
        return null;
    var themeMap = {
        'Life Experiences': 'LIFE_EXPERIENCES',
        'Health and Well-being': 'HEALTH_AND_WELLBEING',
        'Wellbeing': 'WELLBEING',
        'Business': 'BUSINESS',
        'Food': 'FOOD',
        'Custom': 'CUSTOM',
        'Values and Beliefs': 'VALUES_AND_BELIEFS',
        'Personal History': 'PERSONAL_HISTORY',
        'Career and Education': 'CAREER_AND_EDUCATION',
        'Challenges and Resilience': 'CHALLENGES_AND_RESILIENCE',
        'Relationships and Community': 'RELATIONSHIPS_AND_COMMUNITY',
        'Hobbies and Interests': 'HOBBIES_AND_INTERESTS',
        'Cultural and Heritage': 'CULTURAL_AND_HERITAGE'
    };
    return themeMap[airtableTheme] || null;
}
function syncPromptCategories() {
    return __awaiter(this, void 0, void 0, function () {
        var airtableRecords, _i, airtableRecords_1, record, existingCategory, airtableTheme, mappedTheme, categoryData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchAirtableRecords('Prompt Categories')];
                case 1:
                    airtableRecords = _a.sent();
                    _i = 0, airtableRecords_1 = airtableRecords;
                    _a.label = 2;
                case 2:
                    if (!(_i < airtableRecords_1.length)) return [3 /*break*/, 8];
                    record = airtableRecords_1[_i];
                    return [4 /*yield*/, prisma.promptCategory.findFirst({
                            where: { airtableId: record.id },
                        })];
                case 3:
                    existingCategory = _a.sent();
                    airtableTheme = record.fields.Themes_Enum || null;
                    mappedTheme = mapAirtableThemeToEnum(airtableTheme);
                    categoryData = {
                        airtableId: record.id,
                        category: record.fields.Category || 'Uncategorized',
                        description: record.fields.Description || null,
                        theme: mappedTheme,
                        updatedAt: new Date(),
                    };
                    if (!existingCategory) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma.promptCategory.update({
                            where: { id: existingCategory.id },
                            data: categoryData,
                        })];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, prisma.promptCategory.create({
                        data: categoryData,
                    })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8:
                    console.log("Synced ".concat(airtableRecords.length, " prompt categories"));
                    return [2 /*return*/];
            }
        });
    });
}
function syncPrompts() {
    return __awaiter(this, void 0, void 0, function () {
        var tableCheck, error_2, airtableRecords, promptCategories, syncedCount, errorCount, _loop_1, _i, airtableRecords_2, record, finalCount;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('Starting to sync prompts...');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, prisma.prompt.count()];
                case 2:
                    tableCheck = _b.sent();
                    console.log("Current prompt count in database: ".concat(tableCheck));
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _b.sent();
                    console.error('Error accessing Prompt table:', error_2);
                    throw new Error('Failed to access Prompt table. Please check your database schema.');
                case 4: return [4 /*yield*/, fetchAirtableRecords('Prompts Primary')];
                case 5:
                    airtableRecords = _b.sent();
                    console.log("Found ".concat(airtableRecords.length, " prompts in Airtable"));
                    return [4 /*yield*/, prisma.promptCategory.findMany()];
                case 6:
                    promptCategories = _b.sent();
                    console.log("Found ".concat(promptCategories.length, " prompt categories in database"));
                    syncedCount = 0;
                    errorCount = 0;
                    _loop_1 = function (record) {
                        var categoryAirtableId_1, category, promptText, promptData, existingPrompt, updated, created, error_3;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 6, , 7]);
                                    console.log("Processing prompt: ".concat(record.fields.Prompt));
                                    console.log('Record data:', JSON.stringify(record.fields, null, 2));
                                    categoryAirtableId_1 = ((_a = record.fields['Prompt Category']) === null || _a === void 0 ? void 0 : _a[0]) || null;
                                    category = promptCategories.find(function (cat) { return cat.airtableId === categoryAirtableId_1; });
                                    if (categoryAirtableId_1 && !category) {
                                        console.log("Warning: Category not found for airtableId: ".concat(categoryAirtableId_1));
                                    }
                                    promptText = (record.fields.Prompt || 'Untitled Prompt').substring(0, 255);
                                    promptData = {
                                        airtableId: record.id,
                                        promptText: promptText,
                                        promptType: (record.fields['Prompt Type'] || 'default').toLowerCase(),
                                        isContextEstablishing: Boolean(record.fields['Context Establishing Question']),
                                        promptCategoryId: (category === null || category === void 0 ? void 0 : category.id) || null,
                                        categoryAirtableId: categoryAirtableId_1,
                                        isObjectPrompt: record.fields['Is Object Prompt'] === true,
                                        updatedAt: new Date(),
                                    };
                                    console.log('Attempting to create/update with data:', JSON.stringify(promptData, null, 2));
                                    return [4 /*yield*/, prisma.prompt.findFirst({
                                            where: { airtableId: record.id },
                                        })];
                                case 1:
                                    existingPrompt = _c.sent();
                                    if (!existingPrompt) return [3 /*break*/, 3];
                                    return [4 /*yield*/, prisma.prompt.update({
                                            where: { id: existingPrompt.id },
                                            data: promptData,
                                        })];
                                case 2:
                                    updated = _c.sent();
                                    console.log("Updated prompt: ".concat(promptData.promptText), updated);
                                    return [3 /*break*/, 5];
                                case 3: return [4 /*yield*/, prisma.prompt.create({
                                        data: promptData,
                                    })];
                                case 4:
                                    created = _c.sent();
                                    console.log("Created prompt: ".concat(promptData.promptText), created);
                                    _c.label = 5;
                                case 5:
                                    syncedCount++;
                                    return [3 /*break*/, 7];
                                case 6:
                                    error_3 = _c.sent();
                                    console.error("Error processing prompt ".concat(record.id, ":"), error_3);
                                    console.error('Full error:', JSON.stringify(error_3, null, 2));
                                    errorCount++;
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, airtableRecords_2 = airtableRecords;
                    _b.label = 7;
                case 7:
                    if (!(_i < airtableRecords_2.length)) return [3 /*break*/, 10];
                    record = airtableRecords_2[_i];
                    return [5 /*yield**/, _loop_1(record)];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 7];
                case 10: return [4 /*yield*/, prisma.prompt.count()];
                case 11:
                    finalCount = _b.sent();
                    console.log("Final prompt count in database: ".concat(finalCount));
                    console.log("Sync complete. Successfully synced ".concat(syncedCount, " prompts. Errors: ").concat(errorCount));
                    return [2 /*return*/];
            }
        });
    });
}
function syncAll() {
    return __awaiter(this, void 0, void 0, function () {
        var error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 6]);
                    console.log('Starting sync process...');
                    return [4 /*yield*/, syncPromptCategories()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, syncPrompts()];
                case 2:
                    _a.sent();
                    console.log('Sync process completed successfully.');
                    return [3 /*break*/, 6];
                case 3:
                    error_4 = _a.sent();
                    console.error('Error during sync process:', error_4);
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, prisma.$disconnect()];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
syncAll();
