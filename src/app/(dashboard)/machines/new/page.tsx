import { PageHeader } from "@/components/ui";
import { CreateMachineForm } from "@/components/machine-forms";

export default function NewMachinePage() {
  return (
    <>
      <PageHeader
        eyebrow="Machines"
        title="Register machine"
        description="A unique AIG-XXXX-XXXX identifier is generated unless you supply a valid unused Machine ID. Do not enter an ESP32 IP."
      />
      <CreateMachineForm />
    </>
  );
}
