const { prisma } = require('./config/db');

async function syncSkills() {
  console.log("Starting skill synchronization...");
  
  // Fetch all user IT skills
  const userItSkills = await prisma.userItSkill.findMany();
  for (const itSkill of userItSkills) {
    if (itSkill.description) {
      const existing = await prisma.skill.findUnique({
        where: { name: itSkill.description }
      });
      if (!existing) {
        await prisma.skill.create({
          data: {
            name: itSkill.description,
            category: 'it',
            status: 'pending'
          }
        });
        console.log(`Added missing IT skill: ${itSkill.description}`);
      }
    }
  }

  // Fetch all user other qualifications
  const otherQuals = await prisma.userOtherQualification.findMany();
  for (const qual of otherQuals) {
    if (qual.description) {
      const existing = await prisma.skill.findUnique({
        where: { name: qual.description }
      });
      if (!existing) {
        await prisma.skill.create({
          data: {
            name: qual.description,
            category: 'other',
            status: 'pending'
          }
        });
        console.log(`Added missing other qualification: ${qual.description}`);
      }
    }
  }

  console.log("Skill synchronization complete!");
  process.exit(0);
}

syncSkills().catch(err => {
  console.error("Error during sync:", err);
  process.exit(1);
});
