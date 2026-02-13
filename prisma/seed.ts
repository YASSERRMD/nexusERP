import { PrismaClient, AccountType, InvoiceStatus, PaymentType, PaymentMethod, PaymentStatus, JournalStatus, QuotationStatus, PurchaseOrderStatus, EmploymentType } from '@prisma/client';
import { randomBytes, pbkdf2Sync } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

async function main() {
  console.log('Seeding database...');

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme',
      email: 'info@acme.com',
      phone: '+1-555-0100',
      address: '123 Business Avenue, Suite 100, San Francisco',
      currency: 'USD',
      fiscalYear: 2024,
      taxId: 'US-123456789',
    },
  });
  console.log('Created organization:', org.name);

  // Create roles
  const roles = await Promise.all([
    prisma.role.create({ data: { orgId: org.id, name: 'Super Admin', code: 'SUPER_ADMIN', isSystem: true } }),
    prisma.role.create({ data: { orgId: org.id, name: 'Administrator', code: 'ADMIN', isSystem: true } }),
    prisma.role.create({ data: { orgId: org.id, name: 'Accountant', code: 'ACCOUNTANT', isSystem: true } }),
    prisma.role.create({ data: { orgId: org.id, name: 'Sales Manager', code: 'SALES_MANAGER', isSystem: true } }),
    prisma.role.create({ data: { orgId: org.id, name: 'Inventory Manager', code: 'INVENTORY_MANAGER', isSystem: true } }),
    prisma.role.create({ data: { orgId: org.id, name: 'HR Manager', code: 'HR_MANAGER', isSystem: true } }),
    prisma.role.create({ data: { orgId: org.id, name: 'Viewer', code: 'VIEWER', isSystem: true } }),
  ]);
  console.log('Created roles:', roles.length);

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: { orgId: org.id, email: 'admin@acme.com', passwordHash: hashPassword('Admin123!'), firstName: 'John', lastName: 'Admin', isActive: true },
    }),
    prisma.user.create({
      data: { orgId: org.id, email: 'accountant@acme.com', passwordHash: hashPassword('Admin123!'), firstName: 'Sarah', lastName: 'Accountant', isActive: true },
    }),
    prisma.user.create({
      data: { orgId: org.id, email: 'sales@acme.com', passwordHash: hashPassword('Admin123!'), firstName: 'Mike', lastName: 'Sales', isActive: true },
    }),
    prisma.user.create({
      data: { orgId: org.id, email: 'inventory@acme.com', passwordHash: hashPassword('Admin123!'), firstName: 'Lisa', lastName: 'Inventory', isActive: true },
    }),
    prisma.user.create({
      data: { orgId: org.id, email: 'hr@acme.com', passwordHash: hashPassword('Admin123!'), firstName: 'David', lastName: 'HR', isActive: true },
    }),
  ]);
  console.log('Created users:', users.length);

  // Assign roles to users
  await Promise.all([
    prisma.userRole.create({ data: { userId: users[0].id, roleId: roles[0].id } }),
    prisma.userRole.create({ data: { userId: users[1].id, roleId: roles[2].id } }),
    prisma.userRole.create({ data: { userId: users[2].id, roleId: roles[3].id } }),
    prisma.userRole.create({ data: { userId: users[3].id, roleId: roles[4].id } }),
    prisma.userRole.create({ data: { userId: users[4].id, roleId: roles[5].id } }),
  ]);

  // Create chart of accounts
  const accountData = [
    { code: '1000', name: 'Assets', type: AccountType.ASSET },
    { code: '1100', name: 'Cash and Bank', type: AccountType.ASSET },
    { code: '1110', name: 'Cash on Hand', type: AccountType.ASSET },
    { code: '1120', name: 'Bank Account - Operating', type: AccountType.ASSET },
    { code: '1130', name: 'Bank Account - Savings', type: AccountType.ASSET },
    { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET },
    { code: '1210', name: 'Trade Receivables', type: AccountType.ASSET },
    { code: '1300', name: 'Inventory', type: AccountType.ASSET },
    { code: '1310', name: 'Raw Materials', type: AccountType.ASSET },
    { code: '1320', name: 'Work in Progress', type: AccountType.ASSET },
    { code: '1330', name: 'Finished Goods', type: AccountType.ASSET },
    { code: '1400', name: 'Fixed Assets', type: AccountType.ASSET },
    { code: '1410', name: 'Land', type: AccountType.ASSET },
    { code: '1420', name: 'Buildings', type: AccountType.ASSET },
    { code: '1430', name: 'Equipment', type: AccountType.ASSET },
    { code: '2000', name: 'Liabilities', type: AccountType.LIABILITY },
    { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY },
    { code: '2110', name: 'Trade Payables', type: AccountType.LIABILITY },
    { code: '2200', name: 'Short-term Debt', type: AccountType.LIABILITY },
    { code: '2300', name: 'Long-term Debt', type: AccountType.LIABILITY },
    { code: '3000', name: 'Equity', type: AccountType.EQUITY },
    { code: '3100', name: 'Owner Capital', type: AccountType.EQUITY },
    { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY },
    { code: '4000', name: 'Revenue', type: AccountType.REVENUE },
    { code: '4100', name: 'Sales Revenue', type: AccountType.REVENUE },
    { code: '4110', name: 'Product Sales', type: AccountType.REVENUE },
    { code: '4120', name: 'Service Revenue', type: AccountType.REVENUE },
    { code: '4200', name: 'Other Income', type: AccountType.REVENUE },
    { code: '5000', name: 'Expenses', type: AccountType.EXPENSE },
    { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE },
    { code: '5200', name: 'Operating Expenses', type: AccountType.EXPENSE },
    { code: '5210', name: 'Salaries and Wages', type: AccountType.EXPENSE },
    { code: '5220', name: 'Rent Expense', type: AccountType.EXPENSE },
    { code: '5230', name: 'Utilities', type: AccountType.EXPENSE },
    { code: '5240', name: 'Marketing', type: AccountType.EXPENSE },
    { code: '5250', name: 'Travel Expense', type: AccountType.EXPENSE },
    { code: '5300', name: 'Administrative Expenses', type: AccountType.EXPENSE },
  ];

  const accounts = await Promise.all(
    accountData.map((acc) =>
      prisma.account.create({
        data: { orgId: org.id, code: acc.code, name: acc.name, type: acc.type, balance: randomAmount(10000, 500000) },
      })
    )
  );
  console.log('Created accounts:', accounts.length);

  // Create warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.create({ data: { orgId: org.id, code: 'WH-MAIN', name: 'Main Warehouse', address: '123 Storage Lane', isDefault: true } }),
    prisma.warehouse.create({ data: { orgId: org.id, code: 'WH-EAST', name: 'East Coast Distribution', address: '456 Harbor Blvd' } }),
    prisma.warehouse.create({ data: { orgId: org.id, code: 'WH-WEST', name: 'West Coast Hub', address: '789 Pacific Ave' } }),
  ]);
  console.log('Created warehouses:', warehouses.length);

  // Create products
  const categories = ['Electronics', 'Office Supplies', 'Furniture', 'Software', 'Services', 'Hardware', 'Networking', 'Accessories'];
  const products = [];
  for (let i = 1; i <= 60; i++) {
    const category = randomFromArray(categories);
    const product = await prisma.product.create({
      data: {
        orgId: org.id,
        sku: `SKU-${String(i).padStart(4, '0')}`,
        name: `${category} Product ${i}`,
        description: `High quality ${category.toLowerCase()} product`,
        category,
        unit: randomFromArray(['EA', 'PCS', 'BOX', 'KG', 'M', 'SET']),
        costPrice: randomAmount(10, 200),
        salePrice: randomAmount(50, 500),
        minStock: Math.floor(Math.random() * 50) + 10,
        maxStock: Math.floor(Math.random() * 500) + 100,
        isActive: Math.random() > 0.1,
      },
    });
    products.push(product);
  }
  console.log('Created products:', products.length);

  // Create customers
  const customers = [];
  const customerTypes = ['Enterprise', 'SMB', 'Startup', 'Government', 'Non-Profit'];
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
  for (let i = 1; i <= 60; i++) {
    const city = randomFromArray(cities);
    const customer = await prisma.customer.create({
      data: {
        orgId: org.id,
        code: `CUS-${String(i).padStart(4, '0')}`,
        name: `Customer ${i} ${randomFromArray(customerTypes)} Corp`,
        email: `customer${i}@example.com`,
        phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
        address: `${Math.floor(Math.random() * 9000) + 1000} Business St`,
        city,
        state: 'CA',
        country: 'USA',
        postalCode: String(Math.floor(Math.random() * 90000) + 10000),
        creditLimit: randomAmount(5000, 100000),
        paymentTerms: randomFromArray([15, 30, 45, 60]),
        isActive: Math.random() > 0.1,
      },
    });
    customers.push(customer);
  }
  console.log('Created customers:', customers.length);

  // Create vendors
  const vendors = [];
  for (let i = 1; i <= 35; i++) {
    const city = randomFromArray(cities);
    const vendor = await prisma.vendor.create({
      data: {
        orgId: org.id,
        code: `VND-${String(i).padStart(4, '0')}`,
        name: `Vendor ${i} Supplies Inc`,
        email: `vendor${i}@supplier.com`,
        phone: `+1-800-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
        address: `${Math.floor(Math.random() * 9000) + 1000} Industrial Ave`,
        city,
        state: 'NY',
        country: 'USA',
        postalCode: String(Math.floor(Math.random() * 90000) + 10000),
        paymentTerms: randomFromArray([30, 45, 60, 90]),
        isActive: Math.random() > 0.1,
      },
    });
    vendors.push(vendor);
  }
  console.log('Created vendors:', vendors.length);

  // Create employees
  const departments = ['Sales', 'Engineering', 'Marketing', 'Finance', 'HR', 'Operations', 'Support', 'Legal'];
  const positions = ['Manager', 'Senior', 'Junior', 'Lead', 'Director', 'Specialist', 'Analyst', 'Coordinator'];
  const employees = [];
  for (let i = 1; i <= 40; i++) {
    const employee = await prisma.employee.create({
      data: {
        orgId: org.id,
        employeeId: `EMP-${String(i).padStart(4, '0')}`,
        firstName: `Employee${i}`,
        lastName: `Last${i}`,
        email: `employee${i}@acme.com`,
        phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
        department: randomFromArray(departments),
        position: `${randomFromArray(positions)} ${randomFromArray(departments)}`,
        hireDate: randomDate(new Date('2018-01-01'), new Date('2024-01-01')),
        employmentType: randomFromArray([EmploymentType.FULL_TIME, EmploymentType.PART_TIME, EmploymentType.CONTRACT]),
        isActive: Math.random() > 0.1,
      },
    });
    employees.push(employee);
  }
  console.log('Created employees:', employees.length);

  // Create invoices
  const invoiceStatuses = [InvoiceStatus.PAID, InvoiceStatus.PARTIAL, InvoiceStatus.POSTED, InvoiceStatus.SENT, InvoiceStatus.OVERDUE];
  const invoices = [];
  for (let i = 1; i <= 150; i++) {
    const customer = randomFromArray(customers);
    const subtotal = randomAmount(500, 15000);
    const taxAmount = subtotal * 0.1;
    const total = subtotal + taxAmount;
    const amountPaid = Math.random() > 0.5 ? total * randomAmount(0.3, 1) : 0;
    const status = amountPaid >= total ? InvoiceStatus.PAID : amountPaid > 0 ? InvoiceStatus.PARTIAL : randomFromArray(invoiceStatuses);

    const invoice = await prisma.invoice.create({
      data: {
        orgId: org.id,
        customerId: customer.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(i).padStart(5, '0')}`,
        date: randomDate(new Date('2024-01-01'), new Date()),
        dueDate: randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        status,
        subtotal,
        taxAmount,
        total,
        amountPaid,
        amountDue: total - amountPaid,
      },
    });
    invoices.push(invoice);
  }
  console.log('Created invoices:', invoices.length);

  // Create payments
  const paymentMethods = [PaymentMethod.BANK_TRANSFER, PaymentMethod.CHECK, PaymentMethod.CREDIT_CARD, PaymentMethod.CASH];
  const payments = [];
  for (let i = 1; i <= 80; i++) {
    const customer = randomFromArray(customers);
    const vendor = randomFromArray(vendors);
    const isReceived = Math.random() > 0.3;
    
    const payment = await prisma.payment.create({
      data: {
        orgId: org.id,
        paymentType: isReceived ? PaymentType.RECEIVED : PaymentType.ISSUED,
        paymentNumber: `PAY-${new Date().getFullYear()}-${String(i).padStart(5, '0')}`,
        date: randomDate(new Date('2024-01-01'), new Date()),
        amount: randomAmount(100, 10000),
        method: randomFromArray(paymentMethods),
        reference: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        customerId: isReceived ? customer.id : null,
        vendorId: isReceived ? null : vendor.id,
        status: PaymentStatus.COMPLETED,
      },
    });
    payments.push(payment);
  }
  console.log('Created payments:', payments.length);

  // Create journal entries
  const journalEntries = [];
  for (let i = 1; i <= 50; i++) {
    const debitAccount = randomFromArray(accounts.filter(a => a.type === AccountType.ASSET || a.type === AccountType.EXPENSE));
    const creditAccount = randomFromArray(accounts.filter(a => a.type === AccountType.LIABILITY || a.type === AccountType.EQUITY || a.type === AccountType.REVENUE));
    const amount = randomAmount(1000, 50000);
    
    const entry = await prisma.journalEntry.create({
      data: {
        orgId: org.id,
        entryNumber: `JE-${new Date().getFullYear()}-${String(i).padStart(5, '0')}`,
        date: randomDate(new Date('2024-01-01'), new Date()),
        description: `Journal entry for ${randomFromArray(['monthly adjustment', 'accrual', 'correction', 'allocation', 'transfer'])}`,
        status: JournalStatus.POSTED,
        totalDebit: amount,
        totalCredit: amount,
        postedAt: randomDate(new Date('2024-01-01'), new Date()),
        lines: {
          create: [
            { accountId: debitAccount.id, debit: amount, credit: 0 },
            { accountId: creditAccount.id, debit: 0, credit: amount },
          ],
        },
      },
    });
    journalEntries.push(entry);
  }
  console.log('Created journal entries:', journalEntries.length);

  // Create quotations
  const quotationStatuses = [QuotationStatus.SENT, QuotationStatus.ACCEPTED, QuotationStatus.REJECTED, QuotationStatus.EXPIRED];
  const quotations = [];
  for (let i = 1; i <= 30; i++) {
    const customer = randomFromArray(customers);
    const subtotal = randomAmount(1000, 20000);
    const taxAmount = subtotal * 0.1;
    
    const quotation = await prisma.quotation.create({
      data: {
        orgId: org.id,
        customerId: customer.id,
        quoteNumber: `QT-${new Date().getFullYear()}-${String(i).padStart(5, '0')}`,
        date: randomDate(new Date('2024-01-01'), new Date()),
        validUntil: randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        status: randomFromArray(quotationStatuses),
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
      },
    });
    quotations.push(quotation);
  }
  console.log('Created quotations:', quotations.length);

  // Create purchase orders
  const poStatuses = [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.SUBMITTED];
  const purchaseOrders = [];
  for (let i = 1; i <= 25; i++) {
    const vendor = randomFromArray(vendors);
    const subtotal = randomAmount(500, 10000);
    const taxAmount = subtotal * 0.1;
    
    const po = await prisma.purchaseOrder.create({
      data: {
        orgId: org.id,
        vendorId: vendor.id,
        poNumber: `PO-${new Date().getFullYear()}-${String(i).padStart(5, '0')}`,
        date: randomDate(new Date('2024-01-01'), new Date()),
        deliveryDate: randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        status: randomFromArray(poStatuses),
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
      },
    });
    purchaseOrders.push(po);
  }
  console.log('Created purchase orders:', purchaseOrders.length);

  // Create stock levels
  for (const product of products.slice(0, 30)) {
    await prisma.stockLevel.create({
      data: {
        orgId: org.id,
        productId: product.id,
        warehouseId: warehouses[0].id,
        quantity: randomAmount(10, 500),
        availableQty: randomAmount(5, 400),
        value: randomAmount(1000, 50000),
      },
    });
  }
  console.log('Created stock levels');

  console.log('\n=== Seeding Complete ===');
  console.log(`Organization: ${org.name}`);
  console.log(`Users: ${users.length} (login with admin@acme.com / Admin123!)`);
  console.log(`Products: ${products.length}`);
  console.log(`Customers: ${customers.length}`);
  console.log(`Vendors: ${vendors.length}`);
  console.log(`Invoices: ${invoices.length}`);
  console.log(`Payments: ${payments.length}`);
  console.log(`Journal Entries: ${journalEntries.length}`);
  console.log(`Employees: ${employees.length}`);
  console.log(`Accounts: ${accounts.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
