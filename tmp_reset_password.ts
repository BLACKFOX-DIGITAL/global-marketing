import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  const email = 'emily@blackfoxdigital.com.bd';
  const newPassword = 'Blackfox123!';
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  try {
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
    console.log(`Successfully updated password for: ${updatedUser.email}`);
    console.log(`New password set to: ${newPassword}`);
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
