/****** Object:  Table [dbo].[Abdomen]    Script Date: 8/23/2026 3:33:14 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Abdomen](
	[abdomenId] [int] IDENTITY(1,1) NOT NULL,
	[inspeccion] [varchar](100) NULL,
	[palpacion] [varchar](100) NULL,
	[auscultacion] [varchar](300) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_Abdomen] PRIMARY KEY CLUSTERED 
(
	[abdomenId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Antecedente]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Antecedente](
	[tipoAntecedenteId] [int] NOT NULL,
	[historiaId] [int] NOT NULL,
	[descripcion] [varchar](max) NULL,
	[fechaInicio] [varchar](50) NULL,
	[medicacion] [varchar](500) NULL,
	[resolucion] [varchar](max) NULL,
 CONSTRAINT [PK_Antecedente] PRIMARY KEY CLUSTERED 
(
	[tipoAntecedenteId] ASC,
	[historiaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ConsultaInicial]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ConsultaInicial](
	[consultaId] [int] IDENTITY(1,1) NOT NULL,
	[autoValidoTotal] [varchar](max) NULL,
	[autoValidoParcial] [varchar](max) NULL,
	[dependiente] [varchar](max) NULL,
	[motivoConsulta] [varchar](max) NULL,
	[antecedentesEnfermedad] [varchar](max) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_ConsultaInicial] PRIMARY KEY CLUSTERED 
(
	[consultaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Cuello]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Cuello](
	[cuelloId] [int] IDENTITY(1,1) NOT NULL,
	[palpacion] [varchar](100) NULL,
	[tamanio] [varchar](100) NULL,
	[auscultacion] [varchar](max) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_Cuello] PRIMARY KEY CLUSTERED 
(
	[cuelloId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DatosPersonales]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DatosPersonales](
	[datosId] [int] IDENTITY(1,1) NOT NULL,
	[nombreYApellido] [varchar](100) NULL,
	[edad] [varchar](3) NULL,
	[sexo] [varchar](2) NULL,
	[nroDocumento] [varchar](14) NULL,
	[obraSocial] [varchar](100) NULL,
	[obraSocialNro] [varchar](50) NULL,
	[nacionalidad] [varchar](50) NULL,
	[profesion] [varchar](50) NULL,
	[fechaNacimiento] [varchar](25) NULL,
	[estadoCivilId] [int] NULL,
	[domicilio] [varchar](150) NULL,
	[telefono] [varchar](16) NULL,
	[contactoEmergencia] [varchar](100) NULL,
	[telefonoEmergencia] [varchar](16) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_DatosPersonales] PRIMARY KEY CLUSTERED 
(
	[datosId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [historiaId] UNIQUE NONCLUSTERED 
(
	[historiaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[EstadoCivil]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[EstadoCivil](
	[estadoCivilId] [int] NOT NULL,
	[nombre] [varchar](50) NULL,
 CONSTRAINT [PK_EstadoCivil] PRIMARY KEY CLUSTERED 
(
	[estadoCivilId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[EvolucionClinica]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[EvolucionClinica](
	[evolucionId] [int] IDENTITY(1,1) NOT NULL,
	[fecha] [date] NULL,
	[contenido] [varchar](max) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_EvolucionClinica] PRIMARY KEY CLUSTERED 
(
	[evolucionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ExamenVarios]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ExamenVarios](
	[examenVariosId] [int] IDENTITY(1,1) NOT NULL,
	[craneo] [varchar](200) NULL,
	[ojo] [varchar](200) NULL,
	[oido] [varchar](200) NULL,
	[pcfg] [varchar](600) NULL,
	[toraxForma] [varchar](200) NULL,
	[toraxMamas] [varchar](200) NULL,
	[auscultacionMV] [varchar](200) NULL,
	[auscultacionVV] [varchar](200) NULL,
	[rales] [varchar](200) NULL,
	[excursion] [varchar](600) NULL,
	[acvR1] [varchar](200) NULL,
	[acvR2] [varchar](200) NULL,
	[soplos] [varchar](200) NULL,
	[carotideo] [varchar](200) NULL,
	[radial] [varchar](200) NULL,
	[femoral] [varchar](200) NULL,
	[pedio] [varchar](200) NULL,
	[ppRenalDerecha] [varchar](200) NULL,
	[ppRenalIzquierda] [varchar](200) NULL,
	[mamas] [varchar](200) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_ExamenVarios] PRIMARY KEY CLUSTERED 
(
	[examenVariosId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[HabitosToxicos]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[HabitosToxicos](
	[tipoHabitoId] [int] NOT NULL,
	[historiaId] [int] NOT NULL,
 CONSTRAINT [PK_HabitosToxicos] PRIMARY KEY CLUSTERED 
(
	[tipoHabitoId] ASC,
	[historiaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[HistoriaClinica]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[HistoriaClinica](
	[historiaId] [int] IDENTITY(1,1) NOT NULL,
	[diagnosticoPresuntivo] [varchar](max) NULL,
	[metodosComplementarios] [varchar](max) NULL,
	[tratamiento] [varchar](max) NULL,
 CONSTRAINT [PK_HistoriaClinica] PRIMARY KEY CLUSTERED 
(
	[historiaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[OsteoMuscular]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[OsteoMuscular](
	[osteoMuscularId] [int] IDENTITY(1,1) NOT NULL,
	[columnaCervical] [varchar](200) NULL,
	[dorsal] [varchar](200) NULL,
	[lumbar] [varchar](200) NULL,
	[articulaciones] [varchar](200) NULL,
	[movilidad] [varchar](200) NULL,
	[dolor] [varchar](200) NULL,
	[tumefaccion] [varchar](200) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_OsteoMuscular] PRIMARY KEY CLUSTERED 
(
	[osteoMuscularId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SignosVitales]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SignosVitales](
	[signosVitalesId] [int] IDENTITY(1,1) NOT NULL,
	[frecuenciaCardiaca] [varchar](100) NULL,
	[pulsoRadial] [varchar](100) NULL,
	[ritmo] [varchar](100) NULL,
	[presionArterial] [varchar](100) NULL,
	[frecuenciaRespiratoria] [varchar](100) NULL,
	[pesoActual] [varchar](100) NULL,
	[pesoHabitual] [varchar](100) NULL,
	[estatura] [varchar](100) NULL,
	[temperatura] [varchar](100) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_SignosVitales] PRIMARY KEY CLUSTERED 
(
	[signosVitalesId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SistemaNervioso]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SistemaNervioso](
	[sistemaNerviosoId] [int] IDENTITY(1,1) NOT NULL,
	[sensorio] [varchar](200) NULL,
	[lenguaje] [varchar](200) NULL,
	[marcha] [varchar](200) NULL,
	[temblor] [varchar](200) NULL,
	[taxia] [varchar](200) NULL,
	[reflejosFotomotor] [varchar](200) NULL,
	[reflejosAcomodacion] [varchar](200) NULL,
	[osteotendinosos] [varchar](200) NULL,
	[sensibilidad] [varchar](200) NULL,
	[historiaId] [int] NULL,
 CONSTRAINT [PK_SistemaNervioso] PRIMARY KEY CLUSTERED 
(
	[sistemaNerviosoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TipoAntecedente]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TipoAntecedente](
	[tipoAntecedenteId] [int] NOT NULL,
	[nombre] [varchar](60) NOT NULL,
 CONSTRAINT [PK_TipoAntecedente] PRIMARY KEY CLUSTERED 
(
	[tipoAntecedenteId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TipoHabitoToxico]    Script Date: 8/23/2026 3:33:15 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TipoHabitoToxico](
	[tipoHabitoId] [int] NOT NULL,
	[Nombre] [varchar](50) NOT NULL,
 CONSTRAINT [PK_TipoHabitoToxico] PRIMARY KEY CLUSTERED 
(
	[tipoHabitoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Abdomen]  WITH CHECK ADD  CONSTRAINT [FK_Abdomen_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[Abdomen] CHECK CONSTRAINT [FK_Abdomen_HistoriaClinica]
GO
ALTER TABLE [dbo].[Antecedente]  WITH CHECK ADD  CONSTRAINT [FK_Antecedente_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[Antecedente] CHECK CONSTRAINT [FK_Antecedente_HistoriaClinica]
GO
ALTER TABLE [dbo].[Antecedente]  WITH CHECK ADD  CONSTRAINT [FK_Antecedente_TipoAntecedente] FOREIGN KEY([tipoAntecedenteId])
REFERENCES [dbo].[TipoAntecedente] ([tipoAntecedenteId])
GO
ALTER TABLE [dbo].[Antecedente] CHECK CONSTRAINT [FK_Antecedente_TipoAntecedente]
GO
ALTER TABLE [dbo].[ConsultaInicial]  WITH CHECK ADD  CONSTRAINT [FK_ConsultaInicial_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[ConsultaInicial] CHECK CONSTRAINT [FK_ConsultaInicial_HistoriaClinica]
GO
ALTER TABLE [dbo].[Cuello]  WITH CHECK ADD  CONSTRAINT [FK_Cuello_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[Cuello] CHECK CONSTRAINT [FK_Cuello_HistoriaClinica]
GO
ALTER TABLE [dbo].[DatosPersonales]  WITH CHECK ADD  CONSTRAINT [FK_DatosPersonales_EstadoCivil] FOREIGN KEY([estadoCivilId])
REFERENCES [dbo].[EstadoCivil] ([estadoCivilId])
GO
ALTER TABLE [dbo].[DatosPersonales] CHECK CONSTRAINT [FK_DatosPersonales_EstadoCivil]
GO
ALTER TABLE [dbo].[DatosPersonales]  WITH CHECK ADD  CONSTRAINT [FK_DatosPersonales_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[DatosPersonales] CHECK CONSTRAINT [FK_DatosPersonales_HistoriaClinica]
GO
ALTER TABLE [dbo].[EvolucionClinica]  WITH CHECK ADD  CONSTRAINT [FK_EvolucionClinica_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[EvolucionClinica] CHECK CONSTRAINT [FK_EvolucionClinica_HistoriaClinica]
GO
ALTER TABLE [dbo].[ExamenVarios]  WITH CHECK ADD  CONSTRAINT [FK_ExamenVarios_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[ExamenVarios] CHECK CONSTRAINT [FK_ExamenVarios_HistoriaClinica]
GO
ALTER TABLE [dbo].[HabitosToxicos]  WITH CHECK ADD  CONSTRAINT [FK_HabitosToxicos_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[HabitosToxicos] CHECK CONSTRAINT [FK_HabitosToxicos_HistoriaClinica]
GO
ALTER TABLE [dbo].[HabitosToxicos]  WITH CHECK ADD  CONSTRAINT [FK_HabitosToxicos_TipoHabitoToxico] FOREIGN KEY([tipoHabitoId])
REFERENCES [dbo].[TipoHabitoToxico] ([tipoHabitoId])
GO
ALTER TABLE [dbo].[HabitosToxicos] CHECK CONSTRAINT [FK_HabitosToxicos_TipoHabitoToxico]
GO
ALTER TABLE [dbo].[OsteoMuscular]  WITH CHECK ADD  CONSTRAINT [FK_OsteoMuscular_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[OsteoMuscular] CHECK CONSTRAINT [FK_OsteoMuscular_HistoriaClinica]
GO
ALTER TABLE [dbo].[SignosVitales]  WITH CHECK ADD  CONSTRAINT [FK_SignosVitales_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[SignosVitales] CHECK CONSTRAINT [FK_SignosVitales_HistoriaClinica]
GO
ALTER TABLE [dbo].[SistemaNervioso]  WITH CHECK ADD  CONSTRAINT [FK_SistemaNervioso_HistoriaClinica] FOREIGN KEY([historiaId])
REFERENCES [dbo].[HistoriaClinica] ([historiaId])
GO
ALTER TABLE [dbo].[SistemaNervioso] CHECK CONSTRAINT [FK_SistemaNervioso_HistoriaClinica]
GO
