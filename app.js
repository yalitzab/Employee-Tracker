const mysql = require("mysql");
const inquirer = require("inquirer");
const cTable = require("console.table");
const { resolve } = require("path");

// MySQL server
const connection = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "Dpsql678999@",
    database: "employeeDB"
});

connection.connect(function (err){
    if (err) throw err;
    console.log("connection id", connection.threadId)
    runApp();
})

// Main manue loop
function runApp() {
    inquirer.prompt({
        name: "mainmenu",
        type: "list",
        message: "What would you like to do?",
        choices: [
            "view all departments", 
            "view all roles",
            "view all employees",
            "add department",
            "add a role",
            "add an employee",
            "update an employee role"
        ]
    }).then(responses => {
        switch (responses.mainmenu) {
            case "view all departments":
                displayAllDepartments();
                break;
            case "view all roles":
                displayAllRoles();
                break;
            case "view all employees":
                displayAllEmployees();
                break;
            case "add department":
                addDepartment();
                break;
            case "add a role":
                addRole();
                break;
            case "add an employee":
                addEmployee();
                break;    
            case "update an employee role":
                updateRole();
                break;
        }
    });
}

// Build table that shows all departments
async function displayAllDepartments() {
    console.log(' ');
    await connection.query('SELECT id, name AS department FROM department', (err, res) => {
        if (err) throw err;
        console.table(res);
        runApp();
    })
};

// Builds table which shows existing roles and their departments
async function displayAllRoles() {
    console.log(' ');
    await connection.query('SELECT r.id, title, salary, name AS department FROM role r LEFT JOIN department d ON department_id = d.id', (err, res) => {
        if (err) throw err;
        console.table(res);
        runApp();
    })
};

// Builds complete employee table
async function displayAllEmployees() {
    console.log(' ');
    await connection.query('SELECT e.id, e.first_name AS First_Name, e.last_name AS Last_Name, title AS Title, salary AS Salary, name AS Department, CONCAT(m.first_name, " ", m.last_name) AS Manager FROM employee e LEFT JOIN employee m ON e.manager_id = m.id INNER JOIN role r ON e.role_id = r.id INNER JOIN department d ON r.department_id = d.id', (err, res) => {
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
            message: "Enter new department:"
             
        }
    ]).then(answers => {
        connection.query("INSERT INTO department (name) VALUES (?)", [answers.depName]);
        console.log("\x1b[32m", `${answers.depName} was added to departments.`);
        runApp();
    })
};

function lookup(sqlstatement){
    return new Promise((resolve, reject) => {
        connection.query(sqlstatement, function( err, data){
            if (err) throw err
            resolve(data)
        
        })
    })
}

// Add a new role to the database
async function addRole() {
     lookup("SELECT id, name FROM department").then(data => {
        let newDeparments = data.map(obj => obj.name)
        inquirer.prompt([
            {
                name: "roleName",
                type: "input",
                message: "Enter new role title:",
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
                choices: newDeparments
            }
        ]).then(answers => {
            let depID = data.find(obj => obj.name === answers.roleDepartment).id
            connection.query("INSERT INTO role (title, salary, department_id) VALUES (?)", [[answers.roleName, answers.salaryNum, depID]]);
            console.log("\x1b[32m", `${answers.roleName} was added. Department: ${answers.roleDepartment}`);
            runApp();
        })
     })
    
};

// Adds a new employee after asking for name, role, and manager
async function addEmployee() {
    let positions = await connection.query('SELECT id, title FROM role');
    let managers = await connection.query('SELECT id, CONCAT(first_name, " ", last_name) AS Manager FROM employee');
    lookup("SELECT id, title FROM role").then(dbPosition => {
        let newPosition =  dbPosition.map(obj => obj.title)
        lookup("SELECT id, CONCAT(first_name,  ' ' , last_name) AS Manager FROM employee").then(dbManager => {
            let newManager = dbManager.map(obj => obj.Manager)
            inquirer.prompt([
                {
                    name: "firstName",
                    type: "input",
                    message: "Enter employee's first name:",
        
                },
                {
                    name: "lastName",
                    type: "input",
                    message: "Enter employee's last name:",
                    
                },
                {
                    name: "role",
                    type: "list",
                    message: "Choose employee role:",
                    choices: newPosition
                },
                {
                    name: "manager",
                    type: "list",
                    message: "Choose the employee's manager:",
                    choices: newManager
                }
            ]).then(answers => {
                let positionDetails = dbPosition.find(obj => obj.title === answers.role);
                let manager = dbManager.find(obj => obj.Manager === answers.manager);
                connection.query("INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?)", [[answers.firstName.trim(), answers.lastName.trim(), positionDetails.id, manager.id]]);
                console.log("\x1b[32m", `${answers.firstName} was added to the employee database!`);
                runApp();
            });
        })
      
    })

    
};

// Updates a role on the database
async function updateRole() {
   

   lookup('SELECT id, title FROM role').then(dbRole => {
    let newRole = dbRole.map(obj => obj.title)
      
            
            lookup("select id, concat(first_name,' ', last_name) fullname from employee").then(dbEmployee => {
                let newEmployee = dbEmployee.map(obj => obj.fullname)
                inquirer.prompt( [
                    {
                        name: "roleName",
                        type: "list",
                        message: "Update which role?",
                        choices: newRole
                    },
                    {
                        name: "employeeName",
                        type: "list",
                        message: "Update which employee?",
                        choices: newEmployee
                    }
                ]
                )
                .then(answers => {
                        let employeeID = dbEmployee.find(obj => obj.fullname === answers.employeeName).id
                        let roleID = dbRole.find(obj => obj.title === answers.roleName).id
                        connection.query("UPDATE employee SET  role_id =? WHERE id=?", [  roleID, employeeID]);
                        console.log("\x1b[32m", `${answers.employeeName} was updated.`);
                        runApp();
                    })
            })
   })
}
