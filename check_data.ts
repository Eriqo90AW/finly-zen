
import { getTransactions } from "./src/lib/db";

async function checkData() {
  const transactions = await getTransactions();
  console.log("Total transactions:", transactions.length);
  const recurring = transactions.filter(t => t.isRecurring);
  console.log("Recurring transactions:", recurring.length);
  recurring.forEach(t => {
    console.log(`- ${t.name} (${t.category}): isRecurring=${t.isRecurring}, type=${t.type}`);
  });
}

checkData();
