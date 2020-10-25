const mysql = require("mysql");
const inquirer = require("inquirer");
const cTable = require("console.table");

// MySQL server
const db = new Database({
    host: "localhost",
    port: 3001,
    user: "root",
    password: "Dpsql678999@",
    database: "employeeDB"
});

// 
class Database {
    constructor(config) {
        this.connection = mysql.createConnection(config);
    }

    query(sql, args) {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.connection.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
}

// Main manue loop
function runApp() {
    inquirer.prompt({
        name: "mainmenu",
        type: "list",
        message: "What would you like to do?",
        choices: [
            "View all departments", 
            "View all roles",
            "view all employees",
            "add department",
            "add a role",
            "add an employee",
            "update an employee role"
        ]
    }).then(responses => {
        switch (responses.mainmenu) {
            case "View All Departments":
                displayAllDepartments();
                break;
            case "View Roles":
                displayAllRoles();
                break;
            case "View All Employees":
                displayAllEmployees();
                break;
            case "Add Department":
                addDepartment();
                break;
            case "Add a role":
                addRole();
                break;
            case "Add an Employee":
                addEmployee();
                break;    
            case "Update an Employee Role":
                updateRole();
                break;
        }
    });
}

// Build table that shows all departments
async function displayAllDepartments() {
    console.log(' ');
    await db.query('SELECT id, name AS department FROM department', (err, res) => {
        if (err) throw err;
        console.table(res);
        runApp();
    })
};

// Builds table which shows existing roles and their departments
async function displayAllRoles() {
    console.log(' ');
    await db.query('SELECT r.id, title, salary, name AS department FROM role r LEFT JOIN department d ON department_id = d.id', (err, res) => {
        if (err) throw err;
        console.table(res);
        runApp();
    })
};

// Builds complete employee table
async function displayAllEmployees() {
    console.log(' ');
    await db.query('SELECT e.id, e.first_name AS First_Name, e.last_name AS Last_Name, title AS Title, salary AS Salary, name AS Department, CONCAT(m.first_name, " ", m.last_name) AS Manager FROM employee e LEFT JOIN employee m ON e.manager_id = m.id INNER JOIN role r ON e.role_id = r.id INNER JOIN department d ON r.department_id = d.id', (err, res) => {
        if (err) throw err;
        console.table(res);
        runApp();
    });
};

// Add a new department
async function addDepartment() {
    inquirer.prompt([
        {
            name: "depName",
            type: "input",
            message: "Enter new department:",
            validate: confirmStringInput
        }
    ]).then(answers => {
        db.query("INSERT INTO department (name) VALUES (?)", [answers.depName]);
        console.log("\x1b[32m", `${answers.depName} was added to departments.`);
        runApp();
    })
};

// Add a new role to the database
async function addRole() {
    let departments = await db.query('SELECT id, name FROM department');

    inquirer.prompt([
        {
            name: "roleName",
            type: "input",
            message: "Enter new role title:",
            validate: confirmStringInput
        },
        {
            name: "salaryNum",
            type: "input",
            message: "Enter role's salary:",
            validate: input => {
                if (!isNaN(input)) {
                    return true;
                }
                return "Please enter a valid number."
            }
        },
        {
            name: "roleDepartment",
            type: "list",
            message: "Choose the role's department:",
            choices: departments.map(obj => obj.name)
        }
    ]).then(answers => {
        let depID = departments.find(obj => obj.name === answers.roleDepartment).id
        db.query("INSERT INTO role (title, salary, department_id) VALUES (?)", [[answers.roleName, answers.salaryNum, depID]]);
        console.log("\x1b[32m", `${answers.roleName} was added. Department: ${answers.roleDepartment}`);
        runApp();
    })
};

// Adds a new employee after asking for name, role, and manager
async function addEmployee() {
    let positions = await db.query('SELECT id, title FROM role');
    let managers = await db.query('SELECT id, CONCAT(first_name, " ", last_name) AS Manager FROM employee');
    managers.unshift({ id: null, Manager: "None" });

    inquirer.prompt([
        {
            name: "firstName",
            type: "input",
            message: "Enter employee's first name:",
            validate: confirmStringInput
        },
        {
            name: "lastName",
            type: "input",
            message: "Enter employee's last name:",
            validate: confirmStringInput
        },
        {
            name: "role",
            type: "list",
            message: "Choose employee role:",
            choices: positions.map(obj => obj.title)
        },
        {
            name: "manager",
            type: "list",
            message: "Choose the employee's manager:",
            choices: managers.map(obj => obj.Manager)
        }
    ]).then(answers => {
        let positionDetails = positions.find(obj => obj.title === answers.role);
        let manager = managers.find(obj => obj.Manager === answers.manager);
        db.query("INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?)", [[answers.firstName.trim(), answers.lastName.trim(), positionDetails.id, manager.id]]);
        console.log("\x1b[32m", `${answers.firstName} was added to the employee database!`);
        runApp();
    });
};

// Updates a role on the database
async function updateRole() {
    let roles = await db.query('SELECT id, title FROM role');
    roles.push({ id: null, title: "Cancel" });
    let departments = await db.query('SELECT id, name FROM department');

    inquirer.prompt([
        {
            name: "roleName",
            type: "list",
            message: "Update which role?",
            choices: roles.map(obj => obj.title)
        }
    ]).then(response => {
        if (response.roleName == "Cancel") {
            runApp();
            return;
        }
        inquirer.prompt([
            {
                name: "salaryNum",
                type: "input",
                message: "Enter role's salary:",
                validate: input => {
                    if (!isNaN(input)) {
                        return true;
                    }
                    return "Please enter a valid number."
                }
            },
            {
                name: "roleDepartment",
                type: "list",
                message: "Choose the role's department:",
                choices: departments.map(obj => obj.name)
            }
        ]).then(answers => {
            let depID = departments.find(obj => obj.name === answers.roleDepartment).id
            let roleID = roles.find(obj => obj.title === response.roleName).id
            db.query("UPDATE role SET title=?, salary=?, department_id=? WHERE id=?", [response.roleName, answers.salaryNum, depID, roleID]);
            console.log("\x1b[32m", `${response.roleName} was updated.`);
            runApp();
        })
    })
};

runApp();