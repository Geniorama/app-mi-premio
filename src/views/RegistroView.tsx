import Container from "@/utils/Container";

const REGISTRO_FORM_SRC =
  "https://forms.zohopublic.com/bhhoteles/form/RegistroFidelizacion/formperma/Cz0qxsYqnKQCWSKcx6rHyTT-H6lcprk6CSjMcTkFUr4";

export default function RegistroView() {
  return (
    <section className="w-full bg-white py-10 px-4 lg:py-6">
      <Container>
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-normal text-custom-green text-center lg:text-4xl">
              Registro fidelización
            </h1>
            <p className="text-slate-600 text-center text-lg mt-5">
              Completa el formulario para unirte al programa.
            </p>
          </header>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
            <iframe
              aria-label="Registro Fidelizacion"
              title="Registro Fidelización"
              className="block h-[min(85vh,900px)] min-h-[1240px] w-full border-0"
              src={REGISTRO_FORM_SRC}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
